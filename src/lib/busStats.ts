// Turns raw BusStopArrival log rows (see amplify/data/log-bus-arrivals — one row per
// (bus, stop) pair every time a 1-minute poll finds a live bus within 30m of a stop) into
// per-stop weekday arrival-time medians and per-segment travel-time medians. There is no
// official UGA Transit timetable to fall back on — their own route pages only publish
// operating hours + an average headway band per time-of-day, explicitly caveated as
// "subject to variation" — so this is the only way to answer "what time does the bus
// usually get to stop X on a Tuesday."

export type ArrivalRow = {
  busId: string
  routeName: string
  stopId: string
  stopName: string
  arrivedAt: string
}

export type RouteStop = { id: string; name: string }

export type StopWeekdayStats = {
  stopId: string
  stopName: string
  // Index 0 = Sunday .. 6 = Saturday, matching Date#getDay()/Intl's weekday numbering.
  medianMinuteByDay: (number | null)[]
  sampleCountByDay: number[]
}

export type SegmentStats = {
  fromStopId: string
  fromStopName: string
  toStopId: string
  toStopName: string
  medianDurationSeconds: number | null
  sampleCount: number
}

// One bus's single loop around the route — e.g. "left the first stop at 7:05am, here's what
// time it hit every other stop along the way." A route is serviced by several vehicles
// running concurrently (confirmed from the live data — e.g. 18 distinct busIds cycling
// Central East over 2.5 days), so "cycles in a day" means the combined count across every
// vehicle, not one bus's own trip count.
export type Cycle = {
  busId: string
  date: string // Athens-local YYYY-MM-DD of the cycle's first recorded stop
  // Aligned to the stopOrder array passed to reconstructCycles — null where this particular
  // lap never recorded that stop (missed by the 1-minute poll, or the lap ended early).
  stopMinutes: (number | null)[]
}

const MIN_SAMPLES = 3
// A bus that takes longer than this between two adjacent stops almost certainly wasn't
// actually running straight between them (traffic-jam outlier, or the same busId picked up
// a different, unrelated run) — excluded rather than skewing the median.
const MAX_SEGMENT_GAP_MINUTES = 40
// Same cap reused as "still the same lap" vs. "this bus went out of service / picked up an
// unrelated run in between" when reconstructing individual cycles.
const MAX_CYCLE_GAP_MINUTES = MAX_SEGMENT_GAP_MINUTES
// A "cycle" that only ever recorded one stop isn't really a reconstructed lap, just noise.
const MIN_STOPS_PER_CYCLE = 2

const ATHENS_TIME_ZONE = 'America/New_York'

// UGA's whole service area sits in one time zone with no DST-adjacent ambiguity for transit
// hours, so a plain Intl format (no manual UTC-offset math) is enough and avoids getting the
// day wrong for a viewer whose browser is in a different time zone than Athens, GA.
const WEEKDAY_FORMATTER = new Intl.DateTimeFormat('en-US', { timeZone: ATHENS_TIME_ZONE, weekday: 'short' })
const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: ATHENS_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

// en-CA's format is plain YYYY-MM-DD, which is also what sorts correctly as a plain string.
const DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: ATHENS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const WEEKDAY_SHORT_TO_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

// Exported for busScheduleStats.ts, which needs the same "what weekday/minute is it right now
// in Athens, regardless of the viewer's own timezone" logic to compare against RouteScheduleStat's
// weekday/hour rows.
export function athensDayOfWeek(iso: string): number {
  const short = WEEKDAY_FORMATTER.format(new Date(iso))
  return WEEKDAY_SHORT_TO_INDEX[short]
}

export function athensMinuteOfDay(iso: string): number {
  const [hour, minute] = TIME_FORMATTER.format(new Date(iso)).split(':').map(Number)
  return hour * 60 + minute
}

function athensDateString(iso: string): string {
  return DATE_FORMATTER.format(new Date(iso))
}

// A Cycle's `date` is already a plain Athens-local YYYY-MM-DD calendar date (not an instant),
// so recovering its weekday must not run back through a timezone conversion — parsing it as
// UTC and reading getUTCDay() back out gives the same weekday no matter what timezone the
// viewer's browser is in.
export function weekdayIndexFromDateString(date: string): number {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

function median(values: number[]): number | null {
  if (values.length < MIN_SAMPLES) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export function formatMinuteOfDay(minute: number): string {
  const h24 = Math.floor(minute / 60) % 24
  const m = Math.round(minute % 60)
  const hour = h24 % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')}${h24 < 12 ? 'am' : 'pm'}`
}

export function computeStopWeekdayStats(rows: ArrivalRow[], stopOrder: RouteStop[]): StopWeekdayStats[] {
  const minutesByStopAndDay = new Map<string, number[][]>()

  rows.forEach((row) => {
    const perDay = minutesByStopAndDay.get(row.stopId) ?? Array.from({ length: 7 }, () => [])
    perDay[athensDayOfWeek(row.arrivedAt)].push(athensMinuteOfDay(row.arrivedAt))
    minutesByStopAndDay.set(row.stopId, perDay)
  })

  return stopOrder.map((stop) => {
    const perDay = minutesByStopAndDay.get(stop.id) ?? Array.from({ length: 7 }, () => [])
    return {
      stopId: stop.id,
      stopName: stop.name,
      medianMinuteByDay: perDay.map((minutes) => median(minutes)),
      sampleCountByDay: perDay.map((minutes) => minutes.length),
    }
  })
}

export function computeSegmentStats(rows: ArrivalRow[], stopOrder: RouteStop[]): SegmentStats[] {
  const stopIndex = new Map(stopOrder.map((stop, index) => [stop.id, index]))

  // Group by (busId) — within one route's rows this is a reasonable proxy for "one vehicle's
  // continuous run," even though the same busId can resurface on a completely different
  // route later in the day/week (confirmed from the live data: the same id shows up across
  // Central East/Eastside Limited/East West). Since every row passed in here is already
  // filtered to a single route, that cross-route reuse can't contaminate this grouping.
  const byBus = new Map<string, ArrivalRow[]>()
  rows.forEach((row) => {
    const list = byBus.get(row.busId) ?? []
    list.push(row)
    byBus.set(row.busId, list)
  })

  const durationsBySegment = new Map<string, number[]>()

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

      const key = `${prev.stopId}->${curr.stopId}`
      const list = durationsBySegment.get(key) ?? []
      list.push(gapSeconds)
      durationsBySegment.set(key, list)
    }
  })

  const segments: SegmentStats[] = []
  for (let i = 0; i < stopOrder.length - 1; i++) {
    const from = stopOrder[i]
    const to = stopOrder[i + 1]
    const durations = durationsBySegment.get(`${from.id}->${to.id}`) ?? []
    segments.push({
      fromStopId: from.id,
      fromStopName: from.name,
      toStopId: to.id,
      toStopName: to.name,
      medianDurationSeconds: median(durations),
      sampleCount: durations.length,
    })
  }
  return segments
}

// Splits each bus's arrival history into individual laps — a new cycle starts whenever the
// next stop doesn't represent forward progress along the route (index went backward or
// stayed put — the loop wrapped around to the start, or restarted) or the gap since the last
// recorded stop is implausibly long (the bus went out of service, or this busId picked up an
// unrelated run — see the module comment on cross-route busId reuse). Unlike
// computeSegmentStats, a skipped stop doesn't end the cycle by itself — coverage is uneven
// enough on some routes that requiring every single stop would fragment almost every lap.
export function reconstructCycles(rows: ArrivalRow[], stopOrder: RouteStop[]): Cycle[] {
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
    let stopMinutes: (number | null)[] | null = null
    let firstIso = ''
    let lastIndex = -1
    let lastTimeMs = 0

    const flush = () => {
      if (stopMinutes && stopMinutes.filter((m) => m != null).length >= MIN_STOPS_PER_CYCLE) {
        cycles.push({ busId, date: athensDateString(firstIso), stopMinutes })
      }
      stopMinutes = null
      lastIndex = -1
    }

    sorted.forEach((row) => {
      const index = stopIndex.get(row.stopId)!
      const timeMs = new Date(row.arrivedAt).getTime()

      if (stopMinutes && index === lastIndex) {
        // Still dwelling at the same stop across polls — not a new stop reached.
        lastTimeMs = timeMs
        return
      }

      const gapMinutes = stopMinutes ? (timeMs - lastTimeMs) / 60_000 : 0
      const continuesForward = stopMinutes != null && index > lastIndex && gapMinutes <= MAX_CYCLE_GAP_MINUTES

      if (!continuesForward) {
        flush()
        stopMinutes = stopOrder.map(() => null)
        firstIso = row.arrivedAt
      }

      stopMinutes![index] = athensMinuteOfDay(row.arrivedAt)
      lastIndex = index
      lastTimeMs = timeMs
    })

    flush()
  })

  return cycles.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    const aStart = a.stopMinutes.find((m) => m != null) ?? 0
    const bStart = b.stopMinutes.find((m) => m != null) ?? 0
    return aStart - bStart
  })
}
