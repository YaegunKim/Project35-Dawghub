import GtfsRealtimeBindings from 'gtfs-realtime-bindings'

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
