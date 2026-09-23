import { describe, expect, it, vi } from 'vitest'
import { planTrip, type LatLng, type TripLeg, type WalkingRoute } from './directions'
import { haversineDistanceMeters } from './geo'
import { AVERAGE_BUS_SPEED_METERS_PER_SECOND, type PassioBus, type PassioRoute, type RouteStop } from './passio'
import type { RouteScheduleStats } from './busScheduleStats'

const origin: LatLng = { lat: 0, lng: 0 }
const destination: LatLng = { lat: 0, lng: 0.02 }

function walkingRoute(distanceMeters: number, durationSeconds: number): WalkingRoute {
  return { distanceMeters, durationSeconds, coordinates: [] }
}

function stop(id: string, longitude: number, polylineIndex: number): RouteStop {
  return { id, name: id, latitude: 0, longitude, polylineIndex }
}

function stopAt(id: string, latitude: number, longitude: number): Omit<RouteStop, 'polylineIndex'> {
  return { id, name: id, latitude, longitude }
}

// planTrip's stats fetcher is injectable the same way its walking fetcher is (see
// directions.ts) — stubbed to null (no historical data) so these tests exercise the flat
// distance/speed fallback deterministically, without a real unmocked Amplify call.
const fetchStats = vi.fn(async () => null)

function makeRoute(id: string, originStop: RouteStop, destStop: RouteStop): PassioRoute {
  return {
    id,
    name: id,
    color: '#000',
    code: id,
    // A single segment whose points walk from originStop's coordinate to destStop's,
    // with polylineIndex 0/1 matching their position in this flattened trace.
    segments: [[[0, originStop.longitude], [0, destStop.longitude]]],
    stops: [{ ...originStop, polylineIndex: 0 }, { ...destStop, polylineIndex: 1 }],
  }
}

// A route through an arbitrary ordered list of stops (not just origin/dest) — needed for the
// transfer test below, where a route's second stop is the shared transfer point rather than
// something near the destination.
function makeMultiStopRoute(id: string, stops: Omit<RouteStop, 'polylineIndex'>[]): PassioRoute {
  return {
    id,
    name: id,
    color: '#000',
    code: id,
    segments: [stops.map((s) => [s.latitude, s.longitude] as [number, number])],
    stops: stops.map((s, index) => ({ ...s, polylineIndex: index })),
  }
}

// RouteScheduleStats with the same single segment duration replicated across every hour of the
// day — planTrip stamps `nowIso` with the real current time, so a stats fixture that only
// covered one specific hour would make these tests flaky depending on when they happen to run.
function statsForAllHours(fromStopId: string, toStopId: string, medianDurationSeconds: number): RouteScheduleStats {
  return {
    routeName: 'unused',
    weekday: Array.from({ length: 7 }, (_, day) => ({ weekday: day, firstDepartureMinute: null, lastArrivalMinute: null, cycleCount: 0 })),
    hour: Array.from({ length: 24 }, (_, hour) => ({
      hour,
      medianHeadwayMinutes: null,
      segments: [{ fromStopId, toStopId, fromStopName: fromStopId, toStopName: toStopId, medianDurationSeconds, sampleCount: 10 }],
    })),
  }
}

describe('planTrip', () => {
  it('always returns a walk-only option built from the injected walking fetcher', async () => {
    const fetchWalking = vi.fn(async () => walkingRoute(1600, 1200))
    const plan = await planTrip(origin, destination, [], [], fetchWalking)

    expect(plan.walkOnly.kind).toBe('walk-only')
    expect(plan.walkOnly.totalDistanceMeters).toBe(1600)
    expect(plan.walkOnly.totalDurationSeconds).toBe(1200)
    expect(plan.walkBus).toBeNull()
  })

  it('offers a walk-bus option when a nearby route makes the trip meaningfully faster', async () => {
    const originStop = stop('A', 0.001, 0)
    const destStop = stop('B', 0.019, 1)
    const route = makeRoute('X', originStop, destStop)

    const fetchWalking = vi.fn(async (from: LatLng, to: LatLng) => {
      if (from.lng === origin.lng && to.lng === destination.lng) return walkingRoute(1600, 1200)
      // The short walks to/from the bus stops are quick either way.
      return walkingRoute(100, 60)
    })

    const plan = await planTrip(origin, destination, [route], [], fetchWalking, fetchStats)

    expect(plan.walkBus).not.toBeNull()
    expect(plan.walkBus?.kind).toBe('walk-bus')
    expect(plan.walkBus?.legs.map((leg) => leg.kind)).toEqual(['walk', 'bus', 'walk'])
    const busLeg = plan.walkBus?.legs.find((leg) => leg.kind === 'bus')
    expect(busLeg && busLeg.kind === 'bus' && busLeg.routeCode).toBe('X')
    expect(plan.walkBus!.totalDurationSeconds).toBeLessThan(plan.walkOnly.totalDurationSeconds)
  })

  it('drops the bus option when it is not even roughly competitive with walking', async () => {
    const originStop = stop('A', 0.001, 0)
    const destStop = stop('B', 0.019, 1)
    const route = makeRoute('X', originStop, destStop)

    const fetchWalking = vi.fn(async (from: LatLng, to: LatLng) => {
      if (from.lng === origin.lng && to.lng === destination.lng) return walkingRoute(150, 200)
      // Walking to/from the stops alone is already slower than just walking straight there.
      return walkingRoute(2000, 1500)
    })

    const plan = await planTrip(origin, destination, [route], [], fetchWalking, fetchStats)
    expect(plan.walkBus).toBeNull()
  })

  it('memoizes walking-leg lookups shared by two route combos with a common stop', async () => {
    const sharedOriginStop = stop('shared-origin', 0.001, 0)
    const destStopB = stop('B', 0.019, 1)
    const destStopC = stop('C', 0.021, 1)
    const routeX = makeRoute('X', sharedOriginStop, destStopB)
    const routeY = makeRoute('Y', sharedOriginStop, destStopC)

    const fetchWalking = vi.fn(async () => walkingRoute(500, 300))
    await planTrip(origin, destination, [routeX, routeY], [], fetchWalking, fetchStats)

    // Expected distinct (from,to) pairs: walk-only, the shared origin->stop leg (fetched
    // once, not once per route), and each route's own stop->destination leg. 4, not 5.
    expect(fetchWalking).toHaveBeenCalledTimes(4)
  })

  it('offers a one-transfer walk-bus option when two routes share a stop and neither alone covers both ends', async () => {
    // T sits far enough from both origin and destination (>1200m, CANDIDATE_STOP_RADIUS_METERS)
    // that it can't accidentally qualify as a direct-route candidate on its own — the only way
    // to reach the destination side is a genuine transfer.
    const originStop = stopAt('A1', 0, 0.001)
    const transferOnA = stopAt('T', 0.02, 0.01)
    const routeA = makeMultiStopRoute('X', [originStop, transferOnA])

    const transferOnB = stopAt('T', 0.02, 0.01)
    const destStop = stopAt('B1', 0, 0.019)
    const routeB = makeMultiStopRoute('Y', [transferOnB, destStop])

    const fetchWalking = vi.fn(async (from: LatLng, to: LatLng) => {
      if (from.lng === origin.lng && to.lng === destination.lng) return walkingRoute(20_000, 15_000) // walk-only deliberately terrible
      return walkingRoute(100, 60)
    })

    const plan = await planTrip(origin, destination, [routeA, routeB], [], fetchWalking, fetchStats)

    expect(plan.walkBus).not.toBeNull()
    expect(plan.walkBus?.legs.map((leg) => leg.kind)).toEqual(['walk', 'bus', 'bus', 'walk'])
    const busLegs = plan.walkBus!.legs.filter((leg): leg is Extract<TripLeg, { kind: 'bus' }> => leg.kind === 'bus')
    expect(busLegs.map((leg) => leg.routeCode)).toEqual(['X', 'Y'])
    // Both hops meet at the same physical stop — no walking leg needed between them.
    expect(busLegs[0].toStop.id).toBe('T')
    expect(busLegs[1].fromStop.id).toBe('T')
  })

  it('ranks candidates by estimated total time, not raw distance, before spending any ORS calls', async () => {
    // Closest stops to origin/destination of any candidate here — would win if ranking used
    // raw distance — but its RouteScheduleStat says the ride itself takes forever.
    const slowOrigin = stopAt('slow-origin', 0, 0.0001)
    const slowDest = stopAt('slow-dest', 0, 0.0199)
    const slowRoute = makeRoute('SLOW', { ...slowOrigin, polylineIndex: 0 }, { ...slowDest, polylineIndex: 0 })

    const fastRoutes = [1, 2, 3, 4].map((i) => {
      const originStop = stopAt(`fast-origin-${i}`, 0, 0.0005 * i)
      const destStop = stopAt(`fast-dest-${i}`, 0, 0.02 - 0.0005 * i)
      return { route: makeRoute(`FAST${i}`, { ...originStop, polylineIndex: 0 }, { ...destStop, polylineIndex: 0 }), originStop, destStop }
    })

    const statsByRoute = new Map<string, RouteScheduleStats>([
      ['SLOW', statsForAllHours('slow-origin', 'slow-dest', 100_000)],
      ...fastRoutes.map(({ route, originStop, destStop }): [string, RouteScheduleStats] => [
        route.name,
        statsForAllHours(originStop.id, destStop.id, 60),
      ]),
    ])
    const fetchStatsForRanking = vi.fn(async (routeName: string) => statsByRoute.get(routeName) ?? null)

    const fetchWalking = vi.fn(async (from: LatLng, to: LatLng) => {
      if (from.lng === origin.lng && to.lng === destination.lng) return walkingRoute(20_000, 15_000)
      return walkingRoute(50, 40)
    })

    await planTrip(
      origin,
      destination,
      [slowRoute, ...fastRoutes.map((f) => f.route)],
      [],
      fetchWalking,
      fetchStatsForRanking,
    )

    // SLOW's stops are the closest of any candidate to origin/destination — if candidates were
    // still ranked by raw distance (the old behavior) it would have made the shortlist and
    // these coordinates would show up in an ORS call. They don't.
    const requestedLngs = fetchWalking.mock.calls.flatMap(([from, to]) => [from.lng, to.lng])
    expect(requestedLngs).not.toContain(0.0001)
    expect(requestedLngs).not.toContain(0.0199)
  })

  it("uses a live bus's GPS-based ETA for the first hop's wait instead of the flat/historical estimate", async () => {
    const originStop = stop('A', 0.001, 0)
    const destStop = stop('B', 0.019, 1)
    const route = makeRoute('X', originStop, destStop)

    const fetchWalking = vi.fn(async (from: LatLng, to: LatLng) => {
      if (from.lng === origin.lng && to.lng === destination.lng) return walkingRoute(1600, 1200)
      return walkingRoute(100, 60)
    })

    // Bus sitting exactly at destStop's coordinates — route X's flat trace only has 2 points
    // (originStop, destStop), so the nearest-point match locks onto destStop's index, and
    // "distance along the loop" back to originStop wraps the whole way around (see passio.ts's
    // distanceAlongLoopMeters), covering the full A->B segment length. That's a large, specific
    // number that couldn't come from the flat 5-minute BUS_WAIT_ESTIMATE_SECONDS fallback.
    const bus: PassioBus = { id: 'bus-1', route: 'X', color: '#000', latitude: destStop.latitude, longitude: destStop.longitude, course: 0 }

    const plan = await planTrip(origin, destination, [route], [bus], fetchWalking, fetchStats)

    const busLeg = plan.walkBus?.legs.find((leg): leg is Extract<TripLeg, { kind: 'bus' }> => leg.kind === 'bus')
    expect(busLeg).toBeDefined()
    const expectedEtaSeconds =
      haversineDistanceMeters(
        { lat: originStop.latitude, lng: originStop.longitude },
        { lat: destStop.latitude, lng: destStop.longitude },
      ) / AVERAGE_BUS_SPEED_METERS_PER_SECOND
    expect(busLeg!.waitSeconds).toBeCloseTo(expectedEtaSeconds, 0)
    expect(busLeg!.waitSeconds).not.toBe(5 * 60)
  })
})
