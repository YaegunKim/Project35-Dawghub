import { client } from './amplifyClient'
import { haversineDistanceMeters, type LatLng } from './geo'
import { computeStopArrivals, type PassioBus, type PassioRoute, type RouteStop } from './passio'
import { estimateBusLegDurationSeconds, estimateWaitSeconds, fetchRouteScheduleStats, type RouteScheduleStats } from './busScheduleStats'

export type { LatLng }

export type DirectionsPoint = LatLng & {
  label: string
  source: 'gps' | 'building' | 'map'
}

export type WalkingRoute = {
  distanceMeters: number
  durationSeconds: number
  coordinates: LatLng[]
}

export type TripLeg =
  | { kind: 'walk'; route: WalkingRoute }
  | {
      kind: 'bus'
      routeName: string
      routeCode: string
      routeColor: string
      fromStop: RouteStop
      toStop: RouteStop
      coordinates: LatLng[]
      distanceMeters: number
      durationSeconds: number
      waitSeconds: number
    }

export type TripOption = {
  // Still just 'walk-only' | 'walk-bus' — a transfer trip is a 'walk-bus' option whose legs
  // happen to contain two consecutive 'bus' entries (no walk between them; see BusHop below)
  // rather than one. Every consumer of TripOption.legs (MapPage's drawTripPlan, the nav HUD,
  // sumOption right below) already iterates legs generically, so this needed no new kind.
  kind: 'walk-only' | 'walk-bus'
  legs: TripLeg[]
  totalDistanceMeters: number
  totalDurationSeconds: number
}

export type TripPlan = {
  walkOnly: TripOption
  walkBus: TripOption | null
}

// How far someone might reasonably walk to catch a bus.
const CANDIDATE_STOP_RADIUS_METERS = 1200
// How many of the nearest in-radius stops on *each side* get considered per route — not
// just the single nearest. The nearest stop to the origin can sit right after the nearest
// stop to the destination in the route's real order, forcing an almost-full-loop ride, while
// the next-nearest origin stop (still an easy walk) might be positioned right before it for a
// one-hop ride — picking only the closest stop per side misses that entirely.
const CANDIDATE_STOPS_PER_SIDE = 4
// Caps how many (direct + transfer) candidates get REAL walking-leg lookups — keeps ORS calls
// per search small regardless of how many routes/route-pairs are nearby. Candidates are ranked
// by *estimated* total time (estimateCandidateSeconds, below — cheap, no network calls) before
// this cap is applied, so the ones that actually get the expensive ORS treatment are the ones
// most likely to matter. Slightly higher than before (was 3) now that transfer candidates
// compete with direct ones for these slots.
const MAX_CANDIDATES_TO_EVALUATE = 4

// No real transit-prediction API exists for UGA's Passio system (confirmed: it only exposes
// live vehicle positions + static routes/stops) — so the bus leg's duration/wait prefer
// RouteScheduleStat's precomputed historical medians (busScheduleStats.ts,
// estimateBusLegDurationSeconds/estimateWaitSeconds) and only fall back to this flat
// distance/speed + fixed-wait guess for a segment/hour that hasn't collected enough samples
// yet (a brand-new route, or one Lambda hasn't finished a first run for).
const BUS_WAIT_ESTIMATE_SECONDS = 5 * 60
// ~4.9 km/h, a typical average pedestrian pace (close to Google's/ORS's own defaults) — used
// only to *rank* candidates before any real ORS walking-leg lookup happens; the finalists that
// make the cut always get replaced with ORS's real distance/duration before being shown.
const AVERAGE_WALK_SPEED_METERS_PER_SECOND = 1.35

export async function fetchWalkingRoute(from: LatLng, to: LatLng): Promise<WalkingRoute> {
  const { data, errors } = await client.queries.getWalkingRoute({
    fromLat: from.lat,
    fromLng: from.lng,
    toLat: to.lat,
    toLng: to.lng,
  })

  if (errors?.length) throw new Error(`getWalkingRoute failed: ${JSON.stringify(errors)}`)
  if (!data || data.distanceMeters == null || data.durationSeconds == null) {
    throw new Error('getWalkingRoute returned no route')
  }

  return {
    distanceMeters: data.distanceMeters,
    durationSeconds: data.durationSeconds,
    coordinates: (data.coordinates ?? []).filter((point): point is { lat: number; lng: number } => point != null),
  }
}

// Nearest in-radius stops *on this specific route's own real stop sequence* — not a flat,
// route-tagged stop list. Passio's own per-stop routeName tag only reflects one "owning" route
// per physical stop, but most routes actually run through stops owned by others (confirmed:
// not one of Central East's 19 real stops is tagged routeName "Central East"), so route.stops
// (src/lib/passio.ts, resolved from Passio's own per-route stop sequence) is the only
// reliable source of "does this route stop near here."
function candidateStopsOnRoute(point: LatLng, route: PassioRoute): { stopIndex: number; stop: RouteStop; distance: number }[] {
  return route.stops
    .map((stop, stopIndex) => ({
      stopIndex,
      stop,
      distance: haversineDistanceMeters(point, { lat: stop.latitude, lng: stop.longitude }),
    }))
    .filter((entry) => entry.distance <= CANDIDATE_STOP_RADIUS_METERS)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, CANDIDATE_STOPS_PER_SIDE)
}

// Slices the route's *real* GPS trace (segments) between two stops' known polylineIndex
// positions (see passio.ts's assignPolylineIndexes) — not a straight line between the stops
// themselves — so the drawn/measured bus leg follows actual streets. "Forward" from
// fromStop to toStop, wrapping around the loop if toStop's index comes first, is unambiguous
// because polylineIndex was assigned in the stops' own known visiting order, not guessed by
// nearest-GPS-point (which breaks whenever a loop's trace passes close to the same spot
// twice, once each direction, and locks onto the wrong pass).
function busLegGeometry(
  route: PassioRoute,
  fromStop: RouteStop,
  toStop: RouteStop,
): { distanceMeters: number; coordinates: LatLng[] } {
  const points = route.segments.flat().map(([lat, lng]) => ({ lat, lng }))
  const fromIndex = fromStop.polylineIndex
  const toIndex = toStop.polylineIndex
  if (fromIndex === toIndex || points.length < 2) return { distanceMeters: 0, coordinates: [] }

  const slice = (start: number, end: number) => points.slice(start, end + 1)
  const coordinates =
    toIndex > fromIndex
      ? slice(fromIndex, toIndex)
      // toStop's point comes "before" fromStop's on the trace — the loop wraps around to
      // reach it, same as the route itself does.
      : [...slice(fromIndex, points.length - 1), ...slice(0, toIndex)]

  let distanceMeters = 0
  for (let i = 0; i < coordinates.length - 1; i++) distanceMeters += haversineDistanceMeters(coordinates[i], coordinates[i + 1])
  return { distanceMeters, coordinates }
}

// One ridden segment of a Candidate — a single-route hop from fromStop to toStop. A direct
// trip has exactly one; a one-transfer trip has two back-to-back (hops[0].toStop and
// hops[1].fromStop are the same physical stop id, just resolved through each route's own
// RouteStop/polylineIndex, so there's no walking leg between them).
type BusHop = { route: PassioRoute; fromStop: RouteStop; toStop: RouteStop; geometry: { distanceMeters: number; coordinates: LatLng[] } }

// A candidate trip shape (which stops to walk to/from, which route(s) to ride) — not yet
// resolved to real walking distances/durations (that only happens for the shortlisted
// finalists, via ORS). originWalkMeters/destWalkMeters are straight-line (haversine), good
// enough to rank candidates against each other but not to show to a rider.
type Candidate = {
  originWalkMeters: number
  destWalkMeters: number
  originStop: RouteStop
  destStop: RouteStop
  hops: BusHop[] // length 1 (direct) or 2 (one transfer) — see planTrip's own comment on why transfers stop at 1
  // Straight-line walk + real ride distance, in meters — cheap to compute alongside the
  // candidate itself, and used to pre-filter (see planTrip) before any RouteScheduleStat
  // fetch, let alone ORS.
  rawDistanceMeters: number
}

// Every route with at least one candidate near `point`, keyed by route so transferCandidates
// can pair them up. A plain array would also work, but callers need "does route X have a
// candidate here" lookups, not just iteration.
function candidatesByRoute(point: LatLng, routes: PassioRoute[]): Map<PassioRoute, ReturnType<typeof candidateStopsOnRoute>> {
  const map = new Map<PassioRoute, ReturnType<typeof candidateStopsOnRoute>>()
  routes.forEach((route) => {
    const candidates = candidateStopsOnRoute(point, route)
    if (candidates.length > 0) map.set(route, candidates)
  })
  return map
}

// A hop shorter than this isn't a real bus ride — it's "board, then immediately arrive,"
// which still costs a full wait+boarding but saves ~nothing over just walking that same short
// gap. Confirmed against real UGA/Passio data: origin and destination often each have their
// own nearest stop within CANDIDATE_STOP_RADIUS_METERS that happen to be the *same* physical
// stop (or two stops the route visits back-to-back), and without this filter candidates built
// from that degenerate 0-30m hop dominate the raw-distance ranking below — a real, useful
// route several hundred meters long loses to a fake "ride" that goes nowhere, purely because
// summing in a ~0m leg makes the total look shorter.
const MIN_HOP_DISTANCE_METERS = 150

// For each route, try every (origin candidate × destination candidate) pair — not just
// nearest-to-nearest — and keep whichever pair gives the shortest walk+ride distance for
// that route. This is pure local geometry (no network calls), so evaluating a handful of
// pairs per route to find the genuinely best one costs nothing extra in ORS calls.
function directCandidates(originCandidates: Map<PassioRoute, ReturnType<typeof candidateStopsOnRoute>>, destCandidates: Map<PassioRoute, ReturnType<typeof candidateStopsOnRoute>>): Candidate[] {
  const results: Candidate[] = []
  originCandidates.forEach((originStops, route) => {
    const destStops = destCandidates.get(route)
    if (!destStops) return

    let best: Candidate | null = null
    originStops.forEach((oc) => {
      destStops.forEach((dc) => {
        if (dc.stopIndex === oc.stopIndex) return
        const geometry = busLegGeometry(route, oc.stop, dc.stop)
        if (geometry.distanceMeters < MIN_HOP_DISTANCE_METERS) return
        const rawDistanceMeters = oc.distance + geometry.distanceMeters + dc.distance
        if (!best || rawDistanceMeters < best.rawDistanceMeters) {
          best = {
            originWalkMeters: oc.distance,
            destWalkMeters: dc.distance,
            originStop: oc.stop,
            destStop: dc.stop,
            hops: [{ route, fromStop: oc.stop, toStop: dc.stop, geometry }],
            rawDistanceMeters,
          }
        }
      })
    })
    if (best) results.push(best)
  })
  return results
}

// One-transfer candidates: routeA has a stop near the origin, routeB has a stop near the
// destination, and they share at least one physical stop (same Passio stop id resolved
// through each route's own sequence) to transfer at. Capped at exactly one transfer — UGA's
// whole system is ~16 routes covering one campus, so a genuinely useful 2+-transfer trip is
// vanishingly rare, and letting the search go deeper would multiply the (already
// route-pair × stop-pair) candidate space for essentially no real benefit.
function transferCandidates(
  originCandidates: Map<PassioRoute, ReturnType<typeof candidateStopsOnRoute>>,
  destCandidates: Map<PassioRoute, ReturnType<typeof candidateStopsOnRoute>>,
): Candidate[] {
  const results: Candidate[] = []

  originCandidates.forEach((originStops, routeA) => {
    destCandidates.forEach((destStops, routeB) => {
      if (routeA === routeB) return
      const stopsOnB = new Map(routeB.stops.map((stop) => [stop.id, stop]))
      const sharedStopsOnA = routeA.stops.filter((stop) => stopsOnB.has(stop.id))
      if (sharedStopsOnA.length === 0) return

      let best: Candidate | null = null
      originStops.forEach((oc) => {
        destStops.forEach((dc) => {
          sharedStopsOnA.forEach((transferStopOnA) => {
            const transferStopOnB = stopsOnB.get(transferStopOnA.id)!
            const geometryA = busLegGeometry(routeA, oc.stop, transferStopOnA)
            const geometryB = busLegGeometry(routeB, transferStopOnB, dc.stop)
            // Both hops have to be real rides — a "transfer" where either leg goes nowhere is
            // really just riding one route with a pointless extra boarding tacked on. See
            // MIN_HOP_DISTANCE_METERS.
            if (geometryA.distanceMeters < MIN_HOP_DISTANCE_METERS || geometryB.distanceMeters < MIN_HOP_DISTANCE_METERS) return
            const rawDistanceMeters = oc.distance + geometryA.distanceMeters + geometryB.distanceMeters + dc.distance
            if (!best || rawDistanceMeters < best.rawDistanceMeters) {
              best = {
                originWalkMeters: oc.distance,
                destWalkMeters: dc.distance,
                originStop: oc.stop,
                destStop: dc.stop,
                hops: [
                  { route: routeA, fromStop: oc.stop, toStop: transferStopOnA, geometry: geometryA },
                  { route: routeB, fromStop: transferStopOnB, toStop: dc.stop, geometry: geometryB },
                ],
                rawDistanceMeters,
              }
            }
          })
        })
      })
      if (best) results.push(best)
    })
  })

  return results
}

// Cheap (no network) estimate of a candidate's total trip time, used only to rank candidates
// against each other before deciding which few deserve a real ORS walking-leg lookup. Uses
// straight-line walk distance/an average pace, and RouteScheduleStat's historical medians for
// ride/wait — the same sources the real leg-building below uses, just without live-bus
// precision (ranking doesn't need to know exactly which vehicle is closest, only "roughly how
// long would this take").
function estimateCandidateSeconds(candidate: Candidate, statsByRoute: Map<string, RouteScheduleStats | null>, nowIso: string): number {
  let seconds = (candidate.originWalkMeters + candidate.destWalkMeters) / AVERAGE_WALK_SPEED_METERS_PER_SECOND
  candidate.hops.forEach((hop) => {
    const stats = statsByRoute.get(hop.route.name) ?? null
    seconds += estimateWaitSeconds(stats, nowIso, BUS_WAIT_ESTIMATE_SECONDS)
    seconds += estimateBusLegDurationSeconds(stats, hop.route.stops, hop.fromStop.id, hop.toStop.id, nowIso, hop.geometry.distanceMeters)
  })
  return seconds
}

// Wait time for a hop's own boarding stop: a live bus actually on its way there (computeStopArrivals'
// real GPS-position ETA, same source the map's stop popups use) is more accurate than any
// historical average, so it wins when available. Falls back to the historical headway-based
// estimate otherwise — including always, for a transfer's *second* hop, since there's no way
// to know which specific vehicle will be at the transfer stop by the time the rider gets there.
function hopWaitSeconds(
  hop: BusHop,
  buses: PassioBus[],
  stats: RouteScheduleStats | null,
  nowIso: string,
): number {
  if (buses.length > 0) {
    const arrivals = computeStopArrivals(
      { id: hop.fromStop.id, name: hop.fromStop.name, color: hop.route.color, latitude: hop.fromStop.latitude, longitude: hop.fromStop.longitude },
      [hop.route],
      buses,
    )
    const liveEtaSeconds = arrivals[0]?.etaSeconds
    if (liveEtaSeconds != null) return liveEtaSeconds
  }
  return estimateWaitSeconds(stats, nowIso, BUS_WAIT_ESTIMATE_SECONDS)
}

function sumOption(kind: TripOption['kind'], legs: TripLeg[]): TripOption {
  let totalDistanceMeters = 0
  let totalDurationSeconds = 0
  legs.forEach((leg) => {
    if (leg.kind === 'walk') {
      totalDistanceMeters += leg.route.distanceMeters
      totalDurationSeconds += leg.route.durationSeconds
    } else {
      totalDistanceMeters += leg.distanceMeters
      totalDurationSeconds += leg.waitSeconds + leg.durationSeconds
    }
  })
  return { kind, legs, totalDistanceMeters, totalDurationSeconds }
}

export async function planTrip(
  origin: LatLng,
  destination: LatLng,
  routes: PassioRoute[],
  // Live positions for hopWaitSeconds' near-term wait estimate on each candidate's *first*
  // boarding leg (see that function) — optional and defaults to none, so callers with no live
  // data (or directions.test.ts) still get a fully working, historical-only estimate.
  buses: PassioBus[] = [],
  fetchWalking: typeof fetchWalkingRoute = fetchWalkingRoute,
  // Injectable the same way fetchWalking is — planTrip is exercised directly in
  // directions.test.ts with no Amplify auth session available, and the real
  // fetchRouteScheduleStats would otherwise make a live, unmocked userPool-authorized
  // GraphQL call from inside those tests.
  fetchStats: typeof fetchRouteScheduleStats = fetchRouteScheduleStats,
): Promise<TripPlan> {
  const originCandidates = candidatesByRoute(origin, routes)
  const destCandidates = candidatesByRoute(destination, routes)

  const allCandidates = [...directCandidates(originCandidates, destCandidates), ...transferCandidates(originCandidates, destCandidates)]

  // A first, raw-distance pass — cheap, no network — trims the pool before *any* RouteScheduleStat
  // fetch. Transfers widen how many distinct routes a search can touch (every route with a
  // stop near either end, times every route-pair sharing a transfer point), and fetching stats
  // for all of them regardless of relevance turned into real, sometimes-a-dozen-plus concurrent
  // GraphQL calls on every search — harmless in production, but it measurably destabilized
  // timing-sensitive callers (a UI effect racing this same search, confirmed via e2e). Distance
  // is a coarser signal than time, but genuinely-competitive candidates rarely have wildly
  // worse raw distance than the true fastest one, so this pass is unlikely to drop a winner.
  const MAX_CANDIDATES_FOR_STATS_LOOKUP = 8
  const distanceFiltered = [...allCandidates].sort((a, b) => a.rawDistanceMeters - b.rawDistanceMeters).slice(0, MAX_CANDIDATES_FOR_STATS_LOOKUP)

  // RouteScheduleStat reads are our own low-cost backend (no per-call cost the way ORS has) —
  // fetching every route touched by the (already distance-trimmed) candidate pool up front, in
  // parallel, is what lets candidates be ranked by realistic estimated time (below) instead of
  // just raw distance, without needing to know in advance which ones will make the final cut.
  const nowIso = new Date().toISOString()
  const statsByRoute = new Map<string, RouteScheduleStats | null>()
  const involvedRouteNames = new Set(distanceFiltered.flatMap((candidate) => candidate.hops.map((hop) => hop.route.name)))
  await Promise.all(
    Array.from(involvedRouteNames).map(async (routeName) => {
      try {
        statsByRoute.set(routeName, await fetchStats(routeName))
      } catch {
        statsByRoute.set(routeName, null)
      }
    }),
  )

  const shortlist = distanceFiltered
    .map((candidate) => ({ candidate, estimatedSeconds: estimateCandidateSeconds(candidate, statsByRoute, nowIso) }))
    .sort((a, b) => a.estimatedSeconds - b.estimatedSeconds)
    .slice(0, MAX_CANDIDATES_TO_EVALUATE)
    .map(({ candidate }) => candidate)

  // Memoize walking-leg lookups within this call — different candidates can share the same
  // nearest stop (e.g. one physical stop served by more than one route).
  const walkingLegCache = new Map<string, Promise<WalkingRoute>>()
  const walkingLeg = (from: LatLng, to: LatLng) => {
    const key = `${from.lat},${from.lng}->${to.lat},${to.lng}`
    const cached = walkingLegCache.get(key)
    if (cached) return cached
    const promise = fetchWalking(from, to)
    walkingLegCache.set(key, promise)
    return promise
  }

  const [walkOnlyResult, ...candidateResults] = await Promise.allSettled([
    walkingLeg(origin, destination),
    ...shortlist.map(async (candidate) => {
      const [toStopLeg, fromStopLeg] = await Promise.all([
        walkingLeg(origin, { lat: candidate.originStop.latitude, lng: candidate.originStop.longitude }),
        walkingLeg({ lat: candidate.destStop.latitude, lng: candidate.destStop.longitude }, destination),
      ])
      const legs: TripLeg[] = [{ kind: 'walk', route: toStopLeg }]
      candidate.hops.forEach((hop, index) => {
        const stats = statsByRoute.get(hop.route.name) ?? null
        legs.push({
          kind: 'bus',
          routeName: hop.route.name,
          routeCode: hop.route.code,
          routeColor: hop.route.color,
          fromStop: hop.fromStop,
          toStop: hop.toStop,
          coordinates: hop.geometry.coordinates,
          distanceMeters: hop.geometry.distanceMeters,
          durationSeconds: estimateBusLegDurationSeconds(stats, hop.route.stops, hop.fromStop.id, hop.toStop.id, nowIso, hop.geometry.distanceMeters),
          // Live-bus precision only makes sense for the very first boarding — see
          // hopWaitSeconds' own comment on why a transfer's second hop always stays historical.
          waitSeconds: index === 0 ? hopWaitSeconds(hop, buses, stats, nowIso) : estimateWaitSeconds(stats, nowIso, BUS_WAIT_ESTIMATE_SECONDS),
        })
      })
      legs.push({ kind: 'walk', route: fromStopLeg })
      return sumOption('walk-bus', legs)
    }),
  ])

  if (walkOnlyResult.status === 'rejected') throw walkOnlyResult.reason

  const walkOnly = sumOption('walk-only', [{ kind: 'walk', route: walkOnlyResult.value }])

  const walkBusOptions = candidateResults.filter(
    (result): result is PromiseFulfilledResult<TripOption> => result.status === 'fulfilled',
  )
  const bestWalkBus =
    walkBusOptions.length === 0
      ? null
      : walkBusOptions.reduce((best, current) =>
          current.value.totalDurationSeconds < best.value.totalDurationSeconds ? current : best,
        ).value

  // On a small campus, almost any two points end up sharing *some* stop within walking
  // radius, even when that "route" is really just walking most of the way with a token bus
  // hop — worse than walking straight there, so a bus option that's clearly worse still gets
  // dropped. But the wait-time estimate is a flat guess (BUS_WAIT_ESTIMATE_SECONDS), not a
  // real headway, so a genuinely-useful, roughly-comparable ride can land a couple minutes on
  // the "slower" side of that guess purely from estimate error — requiring it to be *strictly*
  // faster than walking would hide exactly those close-call options a rider would still want
  // to see and compare, so allow some slack instead of an all-or-nothing cutoff.
  const WALK_BUS_SLOWER_TOLERANCE_SECONDS = 3 * 60
  const walkBus =
    bestWalkBus && bestWalkBus.totalDurationSeconds < walkOnly.totalDurationSeconds + WALK_BUS_SLOWER_TOLERANCE_SECONDS
      ? bestWalkBus
      : null

  return { walkOnly, walkBus }
}
