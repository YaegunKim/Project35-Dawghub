import GtfsRealtimeBindings from 'gtfs-realtime-bindings'
import { isPointOnUgaAthensCampus, nearestUgaAthensCampusBoundaryMeters } from './campusBoundary'

// Athens-Clarke County Transit — the city's public bus system, a separate agency from UGA's
// own Passio-based campus buses (see passio.ts). Runs on the Avail/AvailTec InfoPoint
// platform, not Passio, and speaks industry-standard GTFS/GTFS-Realtime rather than Passio's
// plain JSON — hence the separate types/fetchers here instead of reusing passio.ts's.
const VEHICLE_POSITIONS_URL = 'https://bustracker.accgov.com/InfoPoint/GTFS-Realtime.ashx?Type=VehiclePosition'

export type AthensRoute = {
  id: string
  shortName: string
  longName: string
  color: string
  segments: [number, number][][]
  // Real per-route stop membership, derived from GTFS stop_times.txt/trips.txt (see
  // scripts/fetch-athens-transit-data.mjs) — every stop_id any trip on this route serves,
  // across both directions. Not ordered (a route usually has two trip directions, so there's
  // no single canonical sequence); use it for "does this route serve stop X" checks.
  stopIds: string[]
}

export type AthensStop = {
  id: string
  name: string
  latitude: number
  longitude: number
}

export type AthensBus = {
  id: string
  routeId: string
  latitude: number
  longitude: number
  bearing: number
}

// Route/stop/shape data barely changes and is fetched ahead of time by
// scripts/fetch-athens-transit-data.mjs (`pnpm data:athens-transit`) into a committed JSON
// snapshot — see ugaBuildingsData.json for the same pattern. Dynamically imported (not a
// top-level import) so its ~190KB only loads for users who actually turn this layer on,
// instead of padding every Map page visit.
export async function fetchAthensRoutesAndStops(): Promise<{ routes: AthensRoute[]; stops: AthensStop[] }> {
  const data = await import('./athensTransitData.json')
  return { routes: data.routes as AthensRoute[], stops: data.stops as AthensStop[] }
}

// Athens Transit's ~18 routes mostly serve the city at large — this app only cares about the
// ones that actually reach campus, since the reason Athens Transit is in the app at all is
// "which bus do I take to get to/from campus", not a general-purpose city transit directory.
// Every route converges on the downtown Multimodal Transportation Center regardless of where
// else it goes, so a loose proximity test (e.g. "near any UGA-owned building") isn't a strong
// enough signal — UGA owns scattered admin/outreach offices all over town, and that shared
// downtown hub sits close to several of them anyway. campusBoundary.ts's real, surveyed
// OpenStreetMap campus footprint (isPointOnUgaAthensCampus) gives a true membership test
// instead of an approximated radius.
const ATHENS_APARTMENT_STOP_NAME_PATTERN = /\bapt|apartment|townhome|town homes?\b/i
// A route also counts as campus-relevant if it stops at a student apartment/townhome complex
// near campus, even with zero stops literally inside the campus boundary — off-campus student
// housing is exactly where a lot of the actual ridership lives. GTFS stop names already spell
// these out ("Riverbend Pkwy at Players Club Apts OB", "S Milledge Ave at Argo Apts IB", etc.),
// so this is a real signal already in the data, not a guessed/hardcoded complex list. Off-campus
// housing legitimately sits a short walk/drive from the boundary itself, but still "near UGA"
// and not just anywhere an "apartments" stop happens to exist across all of Athens.
const ATHENS_CAMPUS_APARTMENT_PROXIMITY_METERS = 700

// Which Athens Transit routes actually reach campus, by real per-route stop membership
// (AthensRoute.stopIds, from GTFS stop_times.txt/trips.txt — see
// scripts/fetch-athens-transit-data.mjs). A route that qualifies is kept whole — every stop it
// serves city-wide, not just its campus-adjacent stops — since a rider needs the real route to
// know where it actually goes; this only decides *whether* the route is included, never trims it.
export function campusRelevantAthensRouteIds(routes: AthensRoute[], stops: AthensStop[]): Set<string> {
  const relevantStopIds = new Set(
    stops
      .filter((stop) => {
        if (isPointOnUgaAthensCampus(stop.latitude, stop.longitude)) return true
        if (!ATHENS_APARTMENT_STOP_NAME_PATTERN.test(stop.name)) return false
        return nearestUgaAthensCampusBoundaryMeters(stop.latitude, stop.longitude) <= ATHENS_CAMPUS_APARTMENT_PROXIMITY_METERS
      })
      .map((stop) => stop.id),
  )

  return new Set(routes.filter((route) => route.stopIds.some((stopId) => relevantStopIds.has(stopId))).map((route) => route.id))
}

export async function fetchAthensBuses(): Promise<AthensBus[]> {
  const response = await fetch(VEHICLE_POSITIONS_URL)
  const buffer = new Uint8Array(await response.arrayBuffer())
  const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buffer)

  return feed.entity
    .filter((entity) => entity.vehicle?.position && entity.vehicle.trip?.routeId)
    .map((entity) => ({
      id: entity.vehicle!.vehicle?.id || entity.id,
      routeId: entity.vehicle!.trip!.routeId!,
      latitude: entity.vehicle!.position!.latitude,
      longitude: entity.vehicle!.position!.longitude,
      bearing: entity.vehicle!.position!.bearing ?? 0,
    }))
}
