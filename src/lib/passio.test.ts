import { describe, expect, it } from 'vitest'
import { getBusRouteCode, locateBusOnRoute, type PassioBus, type PassioRoute, type RouteStop } from './passio'

describe('getBusRouteCode', () => {
  it('maps known route names to their short code', () => {
    expect(getBusRouteCode('Central East')).toBe('A')
    expect(getBusRouteCode('Campus Housing Night')).toBe('CN')
    expect(getBusRouteCode('Weekender East')).toBe('WE')
  })

  it('returns an empty string for an unknown route name', () => {
    expect(getBusRouteCode('Not A Real Route')).toBe('')
  })
})

describe('locateBusOnRoute', () => {
  function stop(id: string, longitude: number, polylineIndex: number): RouteStop {
    return { id, name: id, latitude: 0, longitude, polylineIndex }
  }

  function bus(latitude: number, longitude: number): PassioBus {
    return { id: '1', route: 'Test Route', color: '#000', latitude, longitude, course: 0 }
  }

  // A single straight segment with one extra point between each pair of consecutive stops —
  // real Passio traces have many points between stops, so a bus's nearest-point match can land
  // strictly *between* two stops' polylineIndex rather than exactly on one of them (mirrors
  // directions.test.ts's simpler one-point-per-stop fixture, but that fixture can't distinguish
  // "at a stop" from "between stops" the way this test needs to).
  const route: PassioRoute = {
    id: 'route-1',
    name: 'Test Route',
    color: '#BA0C2F',
    code: 'T',
    segments: [[[0, 0], [0, 0.005], [0, 0.01], [0, 0.015], [0, 0.02], [0, 0.025], [0, 0.03]]],
    stops: [stop('A', 0, 0), stop('B', 0.01, 2), stop('C', 0.02, 4), stop('D', 0.03, 6)],
  }

  it('places a bus roughly halfway between two consecutive stops on the correct leg', () => {
    const location = locateBusOnRoute(route, bus(0, 0.015))
    expect(location).not.toBeNull()
    expect(location!.legIndex).toBe(1) // between stop B (index 1) and stop C (index 2)
    expect(location!.progress).toBeGreaterThan(0.3)
    expect(location!.progress).toBeLessThan(0.7)
  })

  it('reports progress near 0 for a bus right at a leg\'s starting stop', () => {
    const location = locateBusOnRoute(route, bus(0, 0.0001))
    expect(location).not.toBeNull()
    expect(location!.legIndex).toBe(0)
    expect(location!.progress).toBeLessThan(0.1)
  })

  it('returns null for a route with fewer than two stops', () => {
    const singleStopRoute: PassioRoute = { ...route, stops: [stop('A', 0, 0)] }
    expect(locateBusOnRoute(singleStopRoute, bus(0, 0.01))).toBeNull()
  })
})
