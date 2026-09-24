// Reads RouteScheduleStat (amplify/data/compute-bus-schedule-stats' precomputed rollup of
// BusStopArrival — see that Lambda's handler.ts for how each stat is derived) and turns it
// into the two things the UI actually needs: "is this route currently outside its usual
// service hours, and if so when should I expect it next" and "how long does this segment
// usually take right now" for directions.ts's bus-leg estimate. Live GPS position (passio.ts's
// computeStopArrivals) stays the primary source whenever a bus is actually being tracked —
// this only fills the gap where live tracking has nothing to say: before the first bus, after
// the last one, or a temporary hole in Passio's own reporting.
import { client } from './amplifyClient'
import { athensDayOfWeek, athensMinuteOfDay } from './busStats'
import { AVERAGE_BUS_SPEED_METERS_PER_SECOND, distanceAlongLoopMeters, locateBusOnRoute, type PassioBus, type PassioRoute } from './passio'

export type SegmentHourStat = {
  fromStopId: string
  fromStopName: string
  toStopId: string
  toStopName: string
  medianDurationSeconds: number
  sampleCount: number
}

export type RouteWeekdayWindow = {
  weekday: number
  firstDepartureMinute: number | null
  lastArrivalMinute: number | null
  cycleCount: number
}

export type RouteHourStat = {
  hour: number
  medianHeadwayMinutes: number | null
  segments: SegmentHourStat[]
}

export type RouteScheduleStats = {
  routeName: string
  weekday: RouteWeekdayWindow[] // always length 7, index 0 (Sun) .. 6 (Sat)
  hour: RouteHourStat[] // sparse — only hours compute-bus-schedule-stats actually saw a cycle in
}

// Mirrors compute-bus-schedule-stats/handler.ts's own MIN_SAMPLES — a weekday window with
// fewer cycles than this wasn't confident enough for the Lambda to fill in
// firstDepartureMinute/lastArrivalMinute (they come back null), so this is really just the
// threshold for "do we have *any* signal to act on" below.
const MIN_CYCLES_FOR_WINDOW = 3

export async function fetchRouteScheduleStats(routeName: string): Promise<RouteScheduleStats | null> {
  // Explicit apiKey mode — this table is public, non-sensitive aggregate schedule data (see
  // resource.ts's authorization comment), and the default 'userPool' mode would otherwise make
  // every stop-popup open depend on fetchAuthSession() resolving a live Cognito session
  // (including an Identity Pool credentials round trip), which MapStopPopup has no reason to
  // wait on or be broken by.
  const { data } = await client.models.RouteScheduleStat.list({
    filter: { routeName: { eq: routeName } },
    authMode: 'apiKey',
  })
  if (data.length === 0) return null

  const weekday: RouteWeekdayWindow[] = Array.from({ length: 7 }, (_, day) => ({
    weekday: day,
    firstDepartureMinute: null,
    lastArrivalMinute: null,
    cycleCount: 0,
  }))
  const hour: RouteHourStat[] = []

  data.forEach((row) => {
    if (row.kind === 'WEEKDAY' && row.weekday != null) {
      weekday[row.weekday] = {
        weekday: row.weekday,
        firstDepartureMinute: row.firstDepartureMinute ?? null,
        lastArrivalMinute: row.lastArrivalMinute ?? null,
        cycleCount: row.cycleCount ?? 0,
      }
    } else if (row.kind === 'HOUR' && row.hour != null) {
      let segments: SegmentHourStat[] = []
      try {
        segments = row.segmentStatsJson ? JSON.parse(row.segmentStatsJson) : []
      } catch {
        segments = []
      }
      hour.push({ hour: row.hour, medianHeadwayMinutes: row.medianHeadwayMinutes ?? null, segments })
    }
  })

  return { routeName, weekday, hour: hour.sort((a, b) => a.hour - b.hour) }
}

export type ServiceState =
  // A live bus is being tracked right now — caller should keep showing the GPS-based ETA
  // (passio.ts's computeStopArrivals); this module has nothing more accurate to add.
  | { kind: 'live' }
  // Before today's usual first departure.
  | { kind: 'beforeFirstBus'; expectedMinute: number; confident: boolean }
  // After today's usual last arrival — expectedMinute/expectedWeekday describe the next
  // upcoming service window (today's window is over, so this always looks at a later day).
  | { kind: 'afterLastBus'; expectedMinute: number | null; expectedWeekday: number; confident: boolean }
  // Inside the usual service window, but no live bus is being tracked right now (a temporary
  // gap in Passio's own reporting, or a real gap between runs) — medianHeadwayMinutes gives a
  // rough "expect one roughly every N minutes" if that hour has enough samples.
  | { kind: 'gap'; medianHeadwayMinutes: number | null }
  // Not enough BusStopArrival history yet for this route/weekday to say anything concrete.
  | { kind: 'noData' }

export function getServiceState(stats: RouteScheduleStats | null, hasLiveBus: boolean, nowIso: string): ServiceState {
  if (hasLiveBus) return { kind: 'live' }
  if (!stats) return { kind: 'noData' }

  const weekday = athensDayOfWeek(nowIso)
  const minute = athensMinuteOfDay(nowIso)
  const today = stats.weekday[weekday]

  if (today.cycleCount < MIN_CYCLES_FOR_WINDOW || today.firstDepartureMinute == null || today.lastArrivalMinute == null) {
    return { kind: 'noData' }
  }

  if (minute < today.firstDepartureMinute) {
    return { kind: 'beforeFirstBus', expectedMinute: today.firstDepartureMinute, confident: today.cycleCount >= MIN_CYCLES_FOR_WINDOW * 2 }
  }

  if (minute > today.lastArrivalMinute) {
    // Stop at offset 6, not 7 — offset 7 wraps back to today itself, which would wrongly
    // re-offer today's own (already-passed) first departure as the "next" one.
    for (let offset = 1; offset <= 6; offset++) {
      const nextWeekday = (weekday + offset) % 7
      const next = stats.weekday[nextWeekday]
      if (next.cycleCount >= MIN_CYCLES_FOR_WINDOW && next.firstDepartureMinute != null) {
        return {
          kind: 'afterLastBus',
          expectedMinute: next.firstDepartureMinute,
          expectedWeekday: nextWeekday,
          confident: next.cycleCount >= MIN_CYCLES_FOR_WINDOW * 2,
        }
      }
    }
    return { kind: 'afterLastBus', expectedMinute: null, expectedWeekday: (weekday + 1) % 7, confident: false }
  }

  const hourStat = stats.hour.find((h) => h.hour === Math.floor(minute / 60))
  return { kind: 'gap', medianHeadwayMinutes: hourStat?.medianHeadwayMinutes ?? null }
}

function segmentDurationSeconds(stats: RouteScheduleStats | null, hour: number, fromStopId: string, toStopId: string): number | null {
  const segments = stats?.hour.find((h) => h.hour === hour)?.segments
  return segments?.find((s) => s.fromStopId === fromStopId && s.toStopId === toStopId)?.medianDurationSeconds ?? null
}

// Sums historical per-segment medians (at the current hour) along an ordered stop sequence
// from fromStopId to toStopId, wrapping past the end back to index 0 the same way a route's
// real loop does (see passio.ts's distanceAlongLoopMeters). Segments with no historical sample
// fall back to a distance/speed estimate prorated to that segment's share of the whole leg, so
// a route with only partial coverage still blends real data where it exists rather than
// discarding it entirely.
export function estimateBusLegDurationSeconds(
  stats: RouteScheduleStats | null,
  routeStops: { id: string }[],
  fromStopId: string,
  toStopId: string,
  nowIso: string,
  fallbackDistanceMeters: number,
): number {
  const fallbackTotalSeconds = fallbackDistanceMeters / AVERAGE_BUS_SPEED_METERS_PER_SECOND
  const fromIndex = routeStops.findIndex((s) => s.id === fromStopId)
  const toIndex = routeStops.findIndex((s) => s.id === toStopId)
  if (!stats || fromIndex === -1 || toIndex === -1 || fromIndex === toIndex || routeStops.length < 2) {
    return fallbackTotalSeconds
  }

  const hour = Math.floor(athensMinuteOfDay(nowIso) / 60)
  const indexes: number[] = []
  for (let i = fromIndex; i !== toIndex; i = (i + 1) % routeStops.length) indexes.push(i)
  indexes.push(toIndex)

  let coveredSeconds = 0
  let coveredSegments = 0
  let missingSegments = 0
  for (let i = 1; i < indexes.length; i++) {
    const seconds = segmentDurationSeconds(stats, hour, routeStops[indexes[i - 1]].id, routeStops[indexes[i]].id)
    if (seconds != null) {
      coveredSeconds += seconds
      coveredSegments += 1
    } else {
      missingSegments += 1
    }
  }

  if (coveredSegments === 0) return fallbackTotalSeconds
  if (missingSegments === 0) return coveredSeconds

  const totalSegments = coveredSegments + missingSegments
  return coveredSeconds + (missingSegments / totalSegments) * fallbackTotalSeconds
}

// A live bus's wait, tracked all the way to the boarding stop rather than as one flat
// distance/speed guess (see AVERAGE_BUS_SPEED_METERS_PER_SECOND) — locateBusOnRoute (passio.ts)
// already knows which stop-to-stop leg a bus is currently on and how far through it, so "how
// long until it reaches fromStop" is that leg's own remaining share plus every full leg after
// it, each timed with the same per-hour historical medians estimateBusLegDurationSeconds
// already sums for a plain historical estimate. This only anchors *where* that summation starts
// to the bus's real current position instead of always starting fresh from fromStop — so the
// live signal keeps informing the estimate for the whole rest of the bus's approach, not just
// an initial crow-flies distance. Returns null when no live bus on this route can be located
// (no buses on it at all, or a degenerate route locateBusOnRoute itself can't place one on).
export function estimateLiveWaitSeconds(
  route: PassioRoute,
  buses: PassioBus[],
  fromStop: { id: string },
  stats: RouteScheduleStats | null,
  nowIso: string,
): number | null {
  const routeBuses = buses.filter((bus) => bus.route === route.name)
  if (routeBuses.length === 0) return null

  const fromIndex = route.stops.findIndex((stop) => stop.id === fromStop.id)
  if (fromIndex === -1) return null

  const flatPoints = route.segments.flat()
  let best: number | null = null

  routeBuses.forEach((bus) => {
    const location = locateBusOnRoute(route, bus)
    if (!location) return

    const nextStopIndex = (location.legIndex + 1) % route.stops.length
    const legFromStop = route.stops[location.legIndex]
    const legToStop = route.stops[nextStopIndex]
    const legDistanceMeters = distanceAlongLoopMeters(flatPoints, legFromStop.polylineIndex, legToStop.polylineIndex)
    const legDurationSeconds = estimateBusLegDurationSeconds(stats, route.stops, legFromStop.id, legToStop.id, nowIso, legDistanceMeters)
    const remainingInLegSeconds = legDurationSeconds * (1 - location.progress)

    const waitSeconds =
      nextStopIndex === fromIndex
        ? remainingInLegSeconds
        : remainingInLegSeconds +
          estimateBusLegDurationSeconds(
            stats,
            route.stops,
            legToStop.id,
            fromStop.id,
            nowIso,
            distanceAlongLoopMeters(flatPoints, legToStop.polylineIndex, route.stops[fromIndex].polylineIndex),
          )

    if (best == null || waitSeconds < best) best = waitSeconds
  })

  return best
}

// E[wait] for a rider arriving at a random moment is half the headway, the standard estimate
// transit planners use for a frequent, roughly-even service — a better guess than a flat
// constant once real headway data exists, same reasoning as the segment estimate above.
export function estimateWaitSeconds(stats: RouteScheduleStats | null, nowIso: string, fallbackSeconds: number): number {
  const hour = Math.floor(athensMinuteOfDay(nowIso) / 60)
  const headwayMinutes = stats?.hour.find((h) => h.hour === hour)?.medianHeadwayMinutes
  return headwayMinutes != null ? Math.max(60, (headwayMinutes * 60) / 2) : fallbackSeconds
}
