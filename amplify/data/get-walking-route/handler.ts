import type { AppSyncResolverHandler } from 'aws-lambda'

type Args = {
  fromLat: number
  fromLng: number
  toLat: number
  toLng: number
}

type Coordinate = {
  lat: number
  lng: number
}

type Result = {
  distanceMeters: number | null
  durationSeconds: number | null
  coordinates: Coordinate[]
}

type OrsGeoJsonResponse = {
  features?: {
    properties?: { summary?: { distance?: number; duration?: number } }
    geometry?: { coordinates?: [number, number][] }
  }[]
}

export const handler: AppSyncResolverHandler<Args, Result> = async (event) => {
  const { fromLat, fromLng, toLat, toLng } = event.arguments

  const response = await fetch('https://api.openrouteservice.org/v2/directions/foot-walking/geojson', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // ORS wants the raw key here, not a "Bearer " prefix.
      Authorization: process.env.ORS_API_KEY!,
    },
    body: JSON.stringify({
      coordinates: [
        [fromLng, fromLat],
        [toLng, toLat],
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenRouteService request failed with status ${response.status}`)
  }

  const data: OrsGeoJsonResponse = await response.json()
  const feature = data.features?.[0]

  // GeoJSON coordinates are [lng, lat] — flip to {lat, lng} to match this codebase's
  // convention elsewhere (PassioRoute.segments is already lat-first).
  const coordinates: Coordinate[] = (feature?.geometry?.coordinates ?? []).map(([lng, lat]) => ({ lat, lng }))

  return {
    distanceMeters: feature?.properties?.summary?.distance ?? null,
    durationSeconds: feature?.properties?.summary?.duration ?? null,
    coordinates,
  }
}
