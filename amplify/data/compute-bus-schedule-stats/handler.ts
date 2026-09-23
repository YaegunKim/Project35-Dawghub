import type { EventBridgeHandler } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb'

// Turns BusStopArrival's raw (bus, stop) proximity log into the small RouteScheduleStat
// rollup the map/directions UI actually reads (see resource.ts's schema comment for the two
// row shapes). Ported from src/lib/busStats.ts's algorithms rather than imported — same
// "duplicated to keep this Lambda self-contained" choice log-bus-arrivals already made, since
// a scheduled function has no bundled amplify_outputs.json/data-client config to lean on.

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))

const UGA_PASSIO_SYSTEM_ID = '3994'
const ATHENS_TIME_ZONE = 'America/New_York'
// Generous on purpose — cheap to scan (this app's whole BusStopArrival table is still small),
// and keeps working unattended as more weekday/hour cells cross MIN_SAMPLES over time instead
// of needing this number bumped by hand later.
const LOOKBACK_DAYS = 45
const MIN_SAMPLES = 3
const MAX_SEGMENT_GAP_MINUTES = 40
const MAX_CYCLE_GAP_MINUTES = MAX_SEGMENT_GAP_MINUTES
const MIN_STOPS_PER_CYCLE = 2

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat('en-US', { timeZone: ATHENS_TIME_ZONE, weekday: 'short' })
const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: ATHENS_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})
const DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: ATHENS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
const WEEKDAY_SHORT_TO_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

// cycle.date is already a plain Athens-local YYYY-MM-DD calendar date (not an instant, see
// athensDateString), so recovering its weekday must not round-trip back through a timezone
// conversion — parsing it as UTC and reading getUTCDay() back out gives the same weekday no
// matter what timezone this Lambda happens to run in. Mirrors src/lib/busStats.ts's
// weekdayIndexFromDateString, which needs the exact same guarantee for the same reason.
function weekdayIndexFromDateString(date: string): number {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}
function athensMinuteAndHour(iso: string): { minute: number; hour: number } {
  const [hour, minute] = TIME_FORMATTER.format(new Date(iso)).split(':').map(Number)
  return { minute: hour * 60 + minute, hour }
}
function athensDateString(iso: string): string {
  return DATE_FORMATTER.format(new Date(iso))
}

function median(values: number[]): number | null {
  if (values.length < MIN_SAMPLES) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

// Trimmed percentile rather than a flat min/max for "first departure"/"last arrival" — a
// single early pull-out-of-service or late straggler shouldn't singlehandedly define what a
// rider should expect, the same reason median is used elsewhere in this file.
function percentile(values: number[], p: number): number | null {
  if (values.length < MIN_SAMPLES) return null
  const sorted = [...values].sort((a, b) => a - b)
  const index = (sorted.length - 1) * p
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower)
}

type ArrivalRow = { busId: string; routeName: string; stopId: string; arrivedAt: string }
type RouteStop = { id: string; name: string }
type Cycle = { busId: string; date: string; startMinute: number; endMinute: number }

// One bus's single lap: a new cycle starts whenever the next recorded stop doesn't represent
// forward progress (loop wrapped, or this busId picked up an unrelated run — busIds are reused
// across routes/shifts, confirmed in passio.ts/busStats.ts) or the gap since the last stop is
// implausibly long. Unlike src/lib/busStats.ts's reconstructCycles, this only keeps each
// cycle's start/end minute (not every intermediate stop) — that's all first/last-departure
// stats need.
function reconstructCycles(rows: ArrivalRow[], stopOrder: RouteStop[]): Cycle[] {
  const stopIndex = new Map(stopOrder.map((stop, index) => [stop.id, index]))
  const byBus = new Map<string, ArrivalRow[]>()
  rows.forEach((row) => {
    if (!stopIndex.has(row.stopId)) return
    const list = byBus.get(row.busId) ?? []
    list.push(row)
    byBus.set(row.busId, list)
  })

  const cycles: Cycle[] = []

  byBus.forEach((busRows, busId) => {
    const sorted = [...busRows].sort((a, b) => a.arrivedAt.localeCompare(b.arrivedAt))
    let stopsSeen = 0
    let firstIso = ''
    let lastIso = ''
    let lastIndex = -1
    let lastTimeMs = 0

    const flush = () => {
      if (stopsSeen >= MIN_STOPS_PER_CYCLE) {
        cycles.push({
          busId,
          date: athensDateString(firstIso),
          startMinute: athensMinuteAndHour(firstIso).minute,
          endMinute: athensMinuteAndHour(lastIso).minute,
        })
      }
      stopsSeen = 0
      lastIndex = -1
    }

    sorted.forEach((row) => {
      const index = stopIndex.get(row.stopId)!
      const timeMs = new Date(row.arrivedAt).getTime()

      if (stopsSeen > 0 && index === lastIndex) {
        lastTimeMs = timeMs
        lastIso = row.arrivedAt
        return
      }

      const gapMinutes = stopsSeen > 0 ? (timeMs - lastTimeMs) / 60_000 : 0
      const continuesForward = stopsSeen > 0 && index > lastIndex && gapMinutes <= MAX_CYCLE_GAP_MINUTES

      if (!continuesForward) {
        flush()
        firstIso = row.arrivedAt
      }

      lastIso = row.arrivedAt
      lastIndex = index
      lastTimeMs = timeMs
      stopsSeen += 1
    })

    flush()
  })

  return cycles
}

export type SegmentHourStat = {
  fromStopId: string
  fromStopName: string
  toStopId: string
  toStopName: string
  medianDurationSeconds: number
  sampleCount: number
}

// Segment durations bucketed by the HOUR the bus left the earlier stop — computed from the
// full per-bus row sequence (not a pre-filtered-by-hour row set), since a segment can straddle
// an hour boundary (left stop A at 8:58, reached stop B at 9:03) and pairing must still see
// both rows regardless of which hour each one falls in.
function computeSegmentStatsByHour(rows: ArrivalRow[], stopOrder: RouteStop[]): Map<number, SegmentHourStat[]> {
  const stopIndex = new Map(stopOrder.map((stop, index) => [stop.id, index]))

  const byBus = new Map<string, ArrivalRow[]>()
  rows.forEach((row) => {
    const list = byBus.get(row.busId) ?? []
    list.push(row)
    byBus.set(row.busId, list)
  })

  // key: `${hour}::${fromStopId}->${toStopId}`
  const durationsByHourSegment = new Map<string, number[]>()

  byBus.forEach((busRows) => {
    const sorted = [...busRows].sort((a, b) => a.arrivedAt.localeCompare(b.arrivedAt))
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]
      const curr = sorted[i]
      const prevIndex = stopIndex.get(prev.stopId)
      const currIndex = stopIndex.get(curr.stopId)
      if (prevIndex == null || currIndex == null || currIndex !== prevIndex + 1) continue

      const gapSeconds = (new Date(curr.arrivedAt).getTime() - new Date(prev.arrivedAt).getTime()) / 1000
      if (gapSeconds <= 0 || gapSeconds > MAX_SEGMENT_GAP_MINUTES * 60) continue

      const hour = athensMinuteAndHour(prev.arrivedAt).hour
      const key = `${hour}::${prev.stopId}->${curr.stopId}`
      const list = durationsByHourSegment.get(key) ?? []
      list.push(gapSeconds)
      durationsByHourSegment.set(key, list)
    }
  })

  const byHour = new Map<number, SegmentHourStat[]>()
  const stopById = new Map(stopOrder.map((stop) => [stop.id, stop]))

  durationsByHourSegment.forEach((durations, key) => {
    const [hourStr, pair] = key.split('::')
    const [fromStopId, toStopId] = pair.split('->')
    const medianDurationSeconds = median(durations)
    if (medianDurationSeconds == null) return

    const hour = Number(hourStr)
    const list = byHour.get(hour) ?? []
    list.push({
      fromStopId,
      fromStopName: stopById.get(fromStopId)?.name ?? fromStopId,
      toStopId,
      toStopName: stopById.get(toStopId)?.name ?? toStopId,
      medianDurationSeconds,
      sampleCount: durations.length,
    })
    byHour.set(hour, list)
  })

  return byHour
}

// Median gap between consecutive cycle *starts* (any vehicle) whose earlier timestamp falls in
// that hour — a proxy for "how often does a bus leave the first stop," pooled across weekdays
// for the same sample-size reason segment stats are (see resource.ts's schema comment).
function computeHeadwayByHour(cycles: Cycle[]): Map<number, number> {
  const sorted = [...cycles].sort((a, b) => (a.date === b.date ? a.startMinute - b.startMinute : a.date.localeCompare(b.date)))
  const gapsByHour = new Map<number, number[]>()

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    if (prev.date !== curr.date) continue // different service day — not a real headway gap
    const gapMinutes = curr.startMinute - prev.startMinute
    if (gapMinutes <= 0 || gapMinutes > MAX_SEGMENT_GAP_MINUTES) continue

    const hour = Math.floor(prev.startMinute / 60) % 24
    const list = gapsByHour.get(hour) ?? []
    list.push(gapMinutes)
    gapsByHour.set(hour, list)
  }

  const result = new Map<number, number>()
  gapsByHour.forEach((gaps, hour) => {
    const value = median(gaps)
    if (value != null) result.set(hour, value)
  })
  return result
}

type RawStop = { id: string; name: string }
type RawRoutePoint = { lat: string; lng: string }
type RawStopsResponse = {
  stops?: Record<string, RawStop>
  routes?: Record<string, [string, string, ...unknown[]]>
  routePoints?: Record<string, RawRoutePoint[][]>
}

// Only the ordered stop id+name sequence per route is needed here (unlike passio.ts/
// log-bus-arrivals, this Lambda never touches GPS geometry) — mirrors those files' own parsing
// of Passio's routePoints/routes/stops response shape.
async function fetchRouteStopOrders(): Promise<Map<string, RouteStop[]>> {
  const response = await fetch('https://passiogo.com/mapGetData.php?getStops=2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ s0: UGA_PASSIO_SYSTEM_ID, sA: 1 }),
  })
  const data: RawStopsResponse = await response.json()

  const stopById = new Map<string, RawStop>()
  Object.values(data.stops ?? {}).forEach((stop) => stopById.set(stop.id, stop))

  const stopOrdersByName = new Map<string, RouteStop[]>()
  Object.entries(data.routePoints ?? {}).forEach(([routeId]) => {
    const meta = data.routes?.[routeId]
    const name = (meta?.[0] ?? '').trim()
    if (stopOrdersByName.has(name)) return // same route can appear under multiple routeIds

    const sequenceEntries = (meta?.slice(2) ?? []) as [string, string, number][]
    const stopIds = sequenceEntries.map(([, stopId]) => stopId)
    const dedupedStopIds = stopIds.length > 1 && stopIds[stopIds.length - 1] === stopIds[0] ? stopIds.slice(0, -1) : stopIds
    const stopOrder = dedupedStopIds
      .map((stopId) => stopById.get(stopId))
      .filter((stop): stop is RawStop => stop != null)
      .map((stop) => ({ id: stop.id, name: stop.name }))

    stopOrdersByName.set(name, stopOrder)
  })

  return stopOrdersByName
}

async function fetchRecentArrivals(): Promise<ArrivalRow[]> {
  const cutoffIso = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const rows: ArrivalRow[] = []
  let exclusiveStartKey: Record<string, unknown> | undefined

  do {
    const result = await ddb.send(
      new ScanCommand({
        TableName: process.env.BUS_STOP_ARRIVAL_TABLE_NAME,
        FilterExpression: 'arrivedAt >= :cutoff',
        ExpressionAttributeValues: { ':cutoff': cutoffIso },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    )
    ;(result.Items ?? []).forEach((item) => {
      rows.push({ busId: item.busId, routeName: item.routeName, stopId: item.stopId, arrivedAt: item.arrivedAt })
    })
    exclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined
  } while (exclusiveStartKey)

  return rows
}

const CREATE_MUTATION = `mutation CreateRouteScheduleStat($input: CreateRouteScheduleStatInput!) { createRouteScheduleStat(input: $input) { id } }`
const UPDATE_MUTATION = `mutation UpdateRouteScheduleStat($input: UpdateRouteScheduleStatInput!) { updateRouteScheduleStat(input: $input) { id } }`

async function graphql(query: string, variables: Record<string, unknown>): Promise<{ ok: true } | { ok: false; errors: unknown[] }> {
  const response = await fetch(process.env.GRAPHQL_ENDPOINT!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.GRAPHQL_API_KEY! },
    body: JSON.stringify({ query, variables }),
  })
  const result: { errors?: unknown[] } = await response.json()
  return result.errors?.length ? { ok: false, errors: result.errors } : { ok: true }
}

// Tries update first rather than checking existence with a GET beforehand — every row after
// the very first run already exists, so this halves the request count in steady state (1
// round trip instead of 2). Amplify's generated update resolver 404s (via a GraphQL error, not
// an HTTP status) when the id doesn't exist yet, which is exactly the "first time seeing this
// route/weekday/hour" case — falling back to create only on that failure keeps both cases
// working with as few requests as possible.
async function upsertRouteScheduleStat(input: Record<string, unknown> & { id: string }): Promise<void> {
  const updateResult = await graphql(UPDATE_MUTATION, { input })
  if (updateResult.ok) return
  const createResult = await graphql(CREATE_MUTATION, { input })
  if (!createResult.ok) throw new Error(`upsert failed for ${input.id}: ${JSON.stringify(createResult.errors)}`)
}

export const handler: EventBridgeHandler<'Scheduled Event', null, void> = async () => {
  const [stopOrdersByName, rows] = await Promise.all([fetchRouteStopOrders(), fetchRecentArrivals()])
  const nowIso = new Date().toISOString()

  const rowsByRoute = new Map<string, ArrivalRow[]>()
  rows.forEach((row) => {
    const list = rowsByRoute.get(row.routeName) ?? []
    list.push(row)
    rowsByRoute.set(row.routeName, list)
  })

  const writes: Promise<void>[] = []

  rowsByRoute.forEach((routeRows, routeName) => {
    const stopOrder = stopOrdersByName.get(routeName)
    if (!stopOrder || stopOrder.length < 2) return

    const cycles = reconstructCycles(routeRows, stopOrder)

    const cyclesByWeekday = new Map<number, Cycle[]>()
    cycles.forEach((cycle) => {
      const day = weekdayIndexFromDateString(cycle.date)
      const list = cyclesByWeekday.get(day) ?? []
      list.push(cycle)
      cyclesByWeekday.set(day, list)
    })

    for (let weekday = 0; weekday < 7; weekday++) {
      const weekdayCycles = cyclesByWeekday.get(weekday) ?? []
      const firstDepartureMinute = percentile(
        weekdayCycles.map((c) => c.startMinute),
        0.1,
      )
      const lastArrivalMinute = percentile(
        weekdayCycles.map((c) => c.endMinute),
        0.9,
      )

      writes.push(
        upsertRouteScheduleStat({
          id: `${routeName}#weekday#${weekday}`,
          routeName,
          kind: 'WEEKDAY',
          weekday,
          firstDepartureMinute,
          lastArrivalMinute,
          cycleCount: weekdayCycles.length,
          computedAt: nowIso,
        }),
      )
    }

    const segmentsByHour = computeSegmentStatsByHour(routeRows, stopOrder)
    const headwayByHour = computeHeadwayByHour(cycles)
    const hoursWithData = new Set([...segmentsByHour.keys(), ...headwayByHour.keys()])

    hoursWithData.forEach((hour) => {
      writes.push(
        upsertRouteScheduleStat({
          id: `${routeName}#hour#${hour}`,
          routeName,
          kind: 'HOUR',
          hour,
          medianHeadwayMinutes: headwayByHour.get(hour) ?? null,
          segmentStatsJson: JSON.stringify(segmentsByHour.get(hour) ?? []),
          computedAt: nowIso,
        }),
      )
    })
  })

  const results = await Promise.allSettled(writes)
  results.forEach((result) => {
    if (result.status === 'rejected') console.error(result.reason)
  })
}
