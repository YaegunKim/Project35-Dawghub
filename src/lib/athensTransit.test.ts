import { describe, expect, it } from 'vitest'
import { campusRelevantAthensRouteIds, type AthensRoute, type AthensStop } from './athensTransit'

// Real coordinates, checked against the actual OpenStreetMap-derived boundary in
// campusBoundary.ts (see the module comment there) — not made up. Tate Student Center sits
// well inside UGA's Athens Main Campus polygon; Georgia Square Mall and a residential stretch
// south of campus (Whitehall Rd area) sit well outside every UGA Athens boundary.
const ON_CAMPUS = { lat: 33.948, lng: -83.3773 } // Tate Student Center
const OFF_CAMPUS = { lat: 33.9396, lng: -83.4193 } // Georgia Square Mall
const OFF_CAMPUS_NEAR = { lat: 33.905, lng: -83.365 } // south of campus, ~700m+ from the boundary

function stop(overrides: Partial<AthensStop>): AthensStop {
  return { id: 'stop-1', name: 'Some Stop', latitude: ON_CAMPUS.lat, longitude: ON_CAMPUS.lng, ...overrides }
}

function route(overrides: Partial<AthensRoute>): AthensRoute {
  return { id: 'route-1', shortName: '1', longName: 'Test Route', color: '#000000', segments: [], stopIds: [], ...overrides }
}

describe('campusRelevantAthensRouteIds', () => {
  it('keeps a route with a stop actually inside the campus boundary', () => {
    const stops = [stop({ id: 'onCampus', latitude: ON_CAMPUS.lat, longitude: ON_CAMPUS.lng })]
    const routes = [route({ id: 'campusRoute', stopIds: ['onCampus'] })]

    expect(campusRelevantAthensRouteIds(routes, stops)).toEqual(new Set(['campusRoute']))
  })

  it('excludes a route whose stops are all outside the campus boundary and not apartment-named', () => {
    const stops = [stop({ id: 'mall', name: 'Georgia Square Mall', latitude: OFF_CAMPUS.lat, longitude: OFF_CAMPUS.lng })]
    const routes = [route({ id: 'mallRoute', stopIds: ['mall'] })]

    expect(campusRelevantAthensRouteIds(routes, stops)).toEqual(new Set())
  })

  it('keeps a route serving a named apartment complex a short distance from the campus boundary', () => {
    // ~530m outside the boundary (verified against the real polygon) — outside the tight
    // membership test, but within the looser apartment-proximity radius.
    const stops = [stop({ id: 'apt', name: 'Riverbend Pkwy at Players Club Apts OB', latitude: 33.95, longitude: -83.365 })]
    const routes = [route({ id: 'apartmentRoute', stopIds: ['apt'] })]

    const relevant = campusRelevantAthensRouteIds(routes, stops)
    expect(relevant.has('apartmentRoute')).toBe(true)
  })

  it('does not treat a distant apartment stop as campus-relevant just because it has "Apt" in its name', () => {
    const stops = [stop({ id: 'farApt', name: 'Downtown Atlanta Apts', latitude: OFF_CAMPUS_NEAR.lat, longitude: OFF_CAMPUS_NEAR.lng })]
    const routes = [route({ id: 'distantRoute', stopIds: ['farApt'] })]

    expect(campusRelevantAthensRouteIds(routes, stops)).toEqual(new Set())
  })

  it('keeps a qualifying route whole — membership only, not a trimmed stop list', () => {
    const stops = [
      stop({ id: 'onCampus', latitude: ON_CAMPUS.lat, longitude: ON_CAMPUS.lng }),
      stop({ id: 'acrossTown', name: 'Georgia Square Mall', latitude: OFF_CAMPUS.lat, longitude: OFF_CAMPUS.lng }),
    ]
    const routes = [route({ id: 'mixedRoute', stopIds: ['onCampus', 'acrossTown'] })]

    const relevant = campusRelevantAthensRouteIds(routes, stops)
    expect(relevant.has('mixedRoute')).toBe(true)
    // The function only reports which routes qualify — callers still render every stop on
    // AthensRoute.stopIds for a qualifying route, not a filtered subset.
    expect(routes[0].stopIds).toEqual(['onCampus', 'acrossTown'])
  })

  it('excludes a route with no stops at all', () => {
    const routes = [route({ id: 'emptyRoute', stopIds: [] })]

    expect(campusRelevantAthensRouteIds(routes, [])).toEqual(new Set())
  })
})
