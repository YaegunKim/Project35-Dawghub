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

const MIN_SAMPLES = 3
// A bus that takes longer than this between two adjacent stops almost certainly wasn't
// actually running straight between them (traffic-jam outlier, or the same busId picked up
// a different, unrelated run) — excluded rather than skewing the median.
const MAX_SEGMENT_GAP_MINUTES = 40

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

const WEEKDAY_SHORT_TO_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

function athensDayOfWeek(iso: string): number {
  const short = WEEKDAY_FORMATTER.format(new Date(iso))
  return WEEKDAY_SHORT_TO_INDEX[short]
}

function athensMinuteOfDay(iso: string): number {
  const [hour, minute] = TIME_FORMATTER.format(new Date(iso)).split(':').map(Number)
  return hour * 60 + minute
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
