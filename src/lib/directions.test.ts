import { describe, expect, it, vi } from 'vitest'
import { planTrip, type LatLng, type WalkingRoute } from './directions'
import type { PassioRoute, RouteStop } from './passio'

const origin: LatLng = { lat: 0, lng: 0 }
const destination: LatLng = { lat: 0, lng: 0.02 }

function walkingRoute(distanceMeters: number, durationSeconds: number): WalkingRoute {
  return { distanceMeters, durationSeconds, coordinates: [] }
}

function stop(id: string, longitude: number, polylineIndex: number): RouteStop {
  return { id, name: id, latitude: 0, longitude, polylineIndex }
}

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

describe('planTrip', () => {
  it('always returns a walk-only option built from the injected walking fetcher', async () => {
    const fetchWalking = vi.fn(async () => walkingRoute(1600, 1200))
    const plan = await planTrip(origin, destination, [], fetchWalking)

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

    const plan = await planTrip(origin, destination, [route], fetchWalking)

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

    const plan = await planTrip(origin, destination, [route], fetchWalking)
    expect(plan.walkBus).toBeNull()
  })

  it('memoizes walking-leg lookups shared by two route combos with a common stop', async () => {
    const sharedOriginStop = stop('shared-origin', 0.001, 0)
    const destStopB = stop('B', 0.019, 1)
    const destStopC = stop('C', 0.021, 1)
    const routeX = makeRoute('X', sharedOriginStop, destStopB)
    const routeY = makeRoute('Y', sharedOriginStop, destStopC)

    const fetchWalking = vi.fn(async () => walkingRoute(500, 300))
    await planTrip(origin, destination, [routeX, routeY], fetchWalking)

    // Expected distinct (from,to) pairs: walk-only, the shared origin->stop leg (fetched
    // once, not once per route), and each route's own stop->destination leg. 4, not 5.
    expect(fetchWalking).toHaveBeenCalledTimes(4)
  })
})
