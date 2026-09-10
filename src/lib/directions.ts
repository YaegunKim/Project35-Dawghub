import { client } from './amplifyClient'
import { haversineDistanceMeters, type LatLng } from './geo'
import { AVERAGE_BUS_SPEED_METERS_PER_SECOND, type PassioRoute, type RouteStop } from './passio'

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
// Caps the number of (route, originStop, destStop) combos that get real walking-leg
// lookups — keeps ORS calls per search small regardless of how many routes are nearby.
const MAX_ROUTE_COMBOS_TO_EVALUATE = 3

// No real transit-prediction API exists for UGA's Passio system (confirmed: it only exposes
// live vehicle positions + static routes/stops), and the BusStopArrival log table doesn't
// have enough history yet for per-segment averages — so the bus leg's duration is a rough
// distance/speed estimate. AVERAGE_BUS_SPEED_METERS_PER_SECOND lives in passio.ts (also used
// by computeStopArrivals there) so it's a one-constant swap once real stats exist.
const BUS_WAIT_ESTIMATE_SECONDS = 5 * 60

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
// route-tagged stop list. Passio's PassioStop.routeName only reflects one "owning" route per
// physical stop, but most routes actually run through stops owned by others (confirmed: not
// one of Central East's 19 real stops is tagged routeName "Central East"), so route.stops
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
  fetchWalking: typeof fetchWalkingRoute = fetchWalkingRoute,
): Promise<TripPlan> {
  // For each route, try every (origin candidate × destination candidate) pair — not just
  // nearest-to-nearest — and keep whichever pair gives the shortest walk+ride distance for
  // that route. This is pure local geometry (no network calls), so evaluating a handful of
  // pairs per route to find the genuinely best one costs nothing extra in ORS calls.
  const combos = routes
    .map((route) => {
      const originCandidates = candidateStopsOnRoute(origin, route)
      const destCandidates = candidateStopsOnRoute(destination, route)
      const pairs = originCandidates.flatMap((originCandidate) =>
        destCandidates
          .filter((destCandidate) => destCandidate.stopIndex !== originCandidate.stopIndex)
          .map((destCandidate) => {
            const busGeometry = busLegGeometry(route, originCandidate.stop, destCandidate.stop)
            return {
              route,
              originStop: originCandidate.stop,
              destStop: destCandidate.stop,
              busGeometry,
              rank: originCandidate.distance + destCandidate.distance + busGeometry.distanceMeters,
            }
          }),
      )
      return pairs.length === 0 ? null : pairs.reduce((best, current) => (current.rank < best.rank ? current : best))
    })
    .filter((combo): combo is NonNullable<typeof combo> => combo != null)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, MAX_ROUTE_COMBOS_TO_EVALUATE)

  // Memoize walking-leg lookups within this call — different combos can share the same
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

  const [walkOnlyResult, ...comboResults] = await Promise.allSettled([
    walkingLeg(origin, destination),
    ...combos.map(async (combo) => {
      const [toStopLeg, fromStopLeg] = await Promise.all([
        walkingLeg(origin, { lat: combo.originStop.latitude, lng: combo.originStop.longitude }),
        walkingLeg({ lat: combo.destStop.latitude, lng: combo.destStop.longitude }, destination),
      ])
      const legs: TripLeg[] = [
        { kind: 'walk', route: toStopLeg },
        {
          kind: 'bus',
          routeName: combo.route.name,
          routeCode: combo.route.code,
          routeColor: combo.route.color,
          fromStop: combo.originStop,
          toStop: combo.destStop,
          coordinates: combo.busGeometry.coordinates,
          distanceMeters: combo.busGeometry.distanceMeters,
          durationSeconds: combo.busGeometry.distanceMeters / AVERAGE_BUS_SPEED_METERS_PER_SECOND,
          waitSeconds: BUS_WAIT_ESTIMATE_SECONDS,
        },
        { kind: 'walk', route: fromStopLeg },
      ]
      return sumOption('walk-bus', legs)
    }),
  ])

  if (walkOnlyResult.status === 'rejected') throw walkOnlyResult.reason

  const walkOnly = sumOption('walk-only', [{ kind: 'walk', route: walkOnlyResult.value }])

  const walkBusOptions = comboResults.filter(
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
