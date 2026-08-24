import { brand } from '../design-system/colors'

const UGA_PASSIO_SYSTEM_ID = '3994'

type RawPassioBus = {
  latitude?: string
  longitude?: string
  route?: string
  color?: string
  calculatedCourse?: string
  busName?: string
}

export type PassioBus = {
  id: string
  route: string
  color: string
  latitude: number
  longitude: number
  course: number
}

export async function fetchUgaBuses(): Promise<PassioBus[]> {
  const response = await fetch('https://passiogo.com/mapGetData.php?getBuses=2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ s0: UGA_PASSIO_SYSTEM_ID, sA: 1 }),
  })

  const data: { buses?: Record<string, RawPassioBus[]> } = await response.json()
  const buses = data.buses ?? {}

  return Object.entries(buses)
    .filter(([id]) => id !== '-1')
    .map(([id, entries]) => {
      const bus = entries[0] ?? {}
      return {
        id,
        route: bus.route?.trim() ?? '',
        color: bus.color ?? brand.primary,
        latitude: Number.parseFloat(bus.latitude ?? ''),
        longitude: Number.parseFloat(bus.longitude ?? ''),
        course: Number.parseFloat(bus.calculatedCourse ?? '0'),
      }
    })
    .filter((bus) => Number.isFinite(bus.latitude) && Number.isFinite(bus.longitude))
}

type RawStop = {
  id: string
  name: string
  color?: string
  latitude: number
  longitude: number
  routeName?: string
}

type RawRoutePoint = { lat: string; lng: string }

type RawStopsResponse = {
  stops?: Record<string, RawStop>
  routes?: Record<string, [string, string, ...unknown[]]>
  routePoints?: Record<string, RawRoutePoint[][]>
}

export type PassioRoute = {
  id: string
  name: string
  color: string
  segments: [number, number][][]
}

export type PassioStop = {
  id: string
  name: string
  color: string
  latitude: number
  longitude: number
  routeName: string
}

export async function fetchUgaRoutesAndStops(): Promise<{
  routes: PassioRoute[]
  stops: PassioStop[]
}> {
  const response = await fetch('https://passiogo.com/mapGetData.php?getStops=2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ s0: UGA_PASSIO_SYSTEM_ID, sA: 1 }),
  })

  const data: RawStopsResponse = await response.json()

  const routes: PassioRoute[] = Object.entries(data.routePoints ?? {}).map(([routeId, segments]) => {
    const meta = data.routes?.[routeId]
    return {
      id: routeId,
      name: meta?.[0] ?? '',
      color: meta?.[1] ?? brand.primary,
      segments: segments.map((segment) =>
        segment.map(
          (point) => [Number.parseFloat(point.lat), Number.parseFloat(point.lng)] as [number, number],
        ),
      ),
    }
  })

  const stops: PassioStop[] = Object.values(data.stops ?? {}).map((stop) => ({
    id: stop.id,
    name: stop.name,
    color: stop.color ?? brand.primary,
    latitude: stop.latitude,
    longitude: stop.longitude,
    routeName: stop.routeName?.trim() ?? '',
  }))

  return { routes, stops }
}
