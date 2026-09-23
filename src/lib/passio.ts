import { brand } from '../design-system/colors'
import { haversineDistanceMeters } from './geo'

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
}

type RawRoutePoint = { lat: string; lng: string }

type RawStopsResponse = {
  stops?: Record<string, RawStop>
  routes?: Record<string, [string, string, ...unknown[]]>
  routePoints?: Record<string, RawRoutePoint[][]>
}

export type RouteStop = {
  id: string
  name: string
  latitude: number
  longitude: number
  // This stop's position within the route's own flattened `segments` trace — lets a bus leg
  // slice the *real* road-following path between two stops instead of a straight line
  // between them. See assignPolylineIndexes for why this can't be a plain global
  // nearest-point search.
  polylineIndex: number
}

export type PassioRoute = {
  id: string
  name: string
  color: string
  code: string
  segments: [number, number][][]
  // Ordered list of stops this route actually visits, resolved from Passio's own per-route
  // stop sequence (data.routes[id] beyond the [name, color] header) rather than Passio's raw
  // per-stop routeName tag — most stops are "owned" by one route in that tag but are visited
  // by several others too (confirmed: none of Central East's 19 real stops are tagged
  // routeName "Central East"), so that tag alone can't tell you what a route stops at.
  stops: RouteStop[]
}

// UGA Passio has no route-code field in its API — these letters are UGA Transit's own
// official route designations (tps.uga.edu/transit/routes-schedules/routes/), hand-mapped
// onto Passio's route display names since the two naming schemes don't otherwise line up.
const BUS_ROUTE_CODES: Record<string, string> = {
  'Central East': 'A',
  'Main Campus': 'B',
  'Campus Housing': 'C',
  'Campus Housing Night': 'CN',
  'North South': 'D',
  'North South Night': 'DN',
  'East West': 'E',
  'Health Science': 'H',
  'Chicopee Shuttle': 'K',
  'Eastside Limited': 'L',
  Milledge: 'M',
  'Milledge Night': 'MN',
  Riverbend: 'R',
  'Vet Med': 'V',
  'West Campus': 'W',
  'Weekender East': 'WE',
}

export function getBusRouteCode(routeName: string): string {
  return BUS_ROUTE_CODES[routeName] ?? ''
}

// A route's trace is a closed loop, so its very first and last points are essentially the
// same spot (confirmed: for one real route, point[0] and point[755] were both ~2m from
// stop 1, with point[755] marginally closer by rounding noise alone) — a plain nearest-point
// search for stop 1 can snap to the *closing* point at the very end of the array instead of
// the true start, which then poisons every subsequent stop's forward-only search (nothing
// left to search after the last index). Only accepting a later candidate when it's
// meaningfully closer — not just closer by noise — keeps the earlier (correct) match.
const POLYLINE_MATCH_IMPROVEMENT_THRESHOLD_METERS = 10

// Finds each stop's position along the route's real GPS trace, in the stops' own known
// order. A global "nearest point" search per stop breaks whenever the loop's trace passes
// close to the same spot twice (once each direction) — it can lock onto the wrong pass and
// silently reverse part of the route. Searching forward-only from the previous stop's match
// removes that ambiguity, since we never re-consider a point the route already passed.
function assignPolylineIndexes(
  stops: Omit<RouteStop, 'polylineIndex'>[],
  flatPoints: [number, number][],
): RouteStop[] {
  let searchStart = 0
  return stops.map((stop) => {
    let bestIndex = searchStart
    let bestDistance = Infinity
    for (let index = searchStart; index < flatPoints.length; index++) {
      const [lat, lng] = flatPoints[index]
      const distance = haversineDistanceMeters({ lat: stop.latitude, lng: stop.longitude }, { lat, lng })
      if (distance < bestDistance - POLYLINE_MATCH_IMPROVEMENT_THRESHOLD_METERS) {
        bestDistance = distance
        bestIndex = index
      }
    }
    searchStart = bestIndex
    return { ...stop, polylineIndex: bestIndex }
  })
}

export type PassioStop = {
  id: string
  name: string
  color: string
  latitude: number
  longitude: number
}

// No real transit-prediction API exists for UGA's Passio system (confirmed: it only exposes
// live vehicle positions + static routes/stops) — also used by directions.ts's bus-leg
// duration estimate, so it's a one-constant swap once BusStopArrival has enough history for
// real per-segment averages.
export const AVERAGE_BUS_SPEED_METERS_PER_SECOND = 5.5 // ~12 mph, in-town shuttle with stops

export type StopArrival = {
  route: PassioRoute
  // null = route serves this stop but has no live bus on it right now (matches
  // "not currently running" elsewhere in the bus layer, e.g. BusLayerPrefs.operatingOnly).
  etaSeconds: number | null
}

export function nearestPolylineIndex(point: [number, number], flatPoints: [number, number][]): number {
  let bestIndex = 0
  let bestDistance = Infinity
  flatPoints.forEach(([lat, lng], index) => {
    const distance = haversineDistanceMeters({ lat: point[0], lng: point[1] }, { lat, lng })
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  })
  return bestIndex
}

// Routes are closed loops, so a bus already past a stop on this pass still reaches it —
// just by continuing on to the end of the trace and wrapping back around to index 0, rather
// than "backing up" to a smaller index. Summing real consecutive-point distances (not a
// straight line from the bus to the stop) avoids the wrong-direction mistake called out in
// PassioRoute.stops' own comment — a bus that looks close as the crow flies can actually be
// on the far side of the loop, close to finishing an entire lap before it gets there.
export function distanceAlongLoopMeters(flatPoints: [number, number][], fromIndex: number, toIndex: number): number {
  const indexes: number[] = []
  for (let i = fromIndex; i !== toIndex; i = (i + 1) % flatPoints.length) indexes.push(i)
  indexes.push(toIndex)

  let total = 0
  for (let i = 1; i < indexes.length; i++) {
    const [lat1, lng1] = flatPoints[indexes[i - 1]]
    const [lat2, lng2] = flatPoints[indexes[i]]
    total += haversineDistanceMeters({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 })
  }
  return total
}

// Which routes actually serve this stop (via PassioRoute.stops — see its own comment for why),
// and for each, the nearest live bus's estimated time to reach it by walking its remaining
// distance along the route's real GPS trace rather than a straight line (see
// distanceAlongLoopMeters).
export function computeStopArrivals(stop: PassioStop, routes: PassioRoute[], buses: PassioBus[]): StopArrival[] {
  return routes
    .filter((route) => route.stops.some((routeStop) => routeStop.id === stop.id))
    .map((route) => {
      const stopEntry = route.stops.find((routeStop) => routeStop.id === stop.id)!
      const flatPoints = route.segments.flat()
      const etaOptions = buses
        .filter((bus) => bus.route === route.name)
        .map((bus) => {
          const busIndex = nearestPolylineIndex([bus.latitude, bus.longitude], flatPoints)
          const distanceMeters = distanceAlongLoopMeters(flatPoints, busIndex, stopEntry.polylineIndex)
          return distanceMeters / AVERAGE_BUS_SPEED_METERS_PER_SECOND
        })
      return { route, etaSeconds: etaOptions.length > 0 ? Math.min(...etaOptions) : null }
    })
}

export type BusRouteLocation = {
  // The bus is between route.stops[legIndex] and route.stops[(legIndex + 1) % stops.length]
  // (wrapping past the last stop back to the first, since routes are closed loops).
  legIndex: number
  // 0 = right at the leg's starting stop, 1 = right at its ending stop.
  progress: number
}

// Where a live bus currently sits between two consecutive stops on its route — for drawing it
// at its real interpolated position in a stop-by-stop timeline (not snapped to whichever stop
// is nearer). Reuses nearestPolylineIndex/distanceAlongLoopMeters (also used by
// computeStopArrivals) so there's one "walk the trace forward, handle the loop wrap"
// implementation instead of a second one just for this.
export function locateBusOnRoute(route: PassioRoute, bus: PassioBus): BusRouteLocation | null {
  if (route.stops.length < 2) return null
  const flatPoints = route.segments.flat()
  if (flatPoints.length < 2) return null

  const busIndex = nearestPolylineIndex([bus.latitude, bus.longitude], flatPoints)

  // Exactly one leg has the bus's forward distance from its starting stop fall within that
  // leg's own length — every other leg either requires wrapping most of the way around the
  // loop to "catch up" to the bus (a large distance that safely exceeds a single leg's length),
  // since distances only ever walk forward, never backward. Falls back to leg 0 (bus effectively
  // treated as sitting right at the first stop) if floating point/data noise leaves none
  // strictly satisfying that — better than throwing over a rare rounding edge case.
  let bestLegIndex = 0
  for (let legIndex = 0; legIndex < route.stops.length; legIndex++) {
    const fromStop = route.stops[legIndex]
    const toStop = route.stops[(legIndex + 1) % route.stops.length]
    const legLength = distanceAlongLoopMeters(flatPoints, fromStop.polylineIndex, toStop.polylineIndex)
    if (legLength === 0) continue
    const distanceFromStart = distanceAlongLoopMeters(flatPoints, fromStop.polylineIndex, busIndex)
    if (distanceFromStart <= legLength) {
      bestLegIndex = legIndex
      break
    }
  }

  const fromStop = route.stops[bestLegIndex]
  const toStop = route.stops[(bestLegIndex + 1) % route.stops.length]
  const legLength = distanceAlongLoopMeters(flatPoints, fromStop.polylineIndex, toStop.polylineIndex)
  const distanceFromStart = distanceAlongLoopMeters(flatPoints, fromStop.polylineIndex, busIndex)
  const progress = legLength === 0 ? 0 : Math.min(1, Math.max(0, distanceFromStart / legLength))

  return { legIndex: bestLegIndex, progress }
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

  const stopById = new Map<string, RawStop>()
  Object.values(data.stops ?? {}).forEach((stop) => stopById.set(stop.id, stop))

  // Passio sometimes serves the same physical route under multiple routeIds with an
  // identical display name (e.g. "Eastside Limited" as both 73969 and 73970) — group by
  // trimmed name so those don't render as duplicate overlapping polylines/checklist rows.
  const routesByName = new Map<string, PassioRoute>()
  Object.entries(data.routePoints ?? {}).forEach(([routeId, segments]) => {
    const meta = data.routes?.[routeId]
    const name = (meta?.[0] ?? '').trim()
    const parsedSegments = segments.map((segment) =>
      segment.map((point) => [Number.parseFloat(point.lat), Number.parseFloat(point.lng)] as [number, number]),
    )

    const existing = routesByName.get(name)
    if (existing) {
      existing.segments.push(...parsedSegments)
    } else {
      // meta beyond [name, color] is Passio's own ordered stop sequence: [order, stopId,
      // flag][]. The loop's closing entry repeats the first stop id — drop it so each stop
      // appears once and "which direction is forward" is unambiguous.
      const sequenceEntries = (meta?.slice(2) ?? []) as [string, string, number][]
      const stopIds = sequenceEntries.map(([, stopId]) => stopId)
      const dedupedStopIds =
        stopIds.length > 1 && stopIds[stopIds.length - 1] === stopIds[0] ? stopIds.slice(0, -1) : stopIds
      const stopsWithoutIndex = dedupedStopIds
        .map((stopId) => stopById.get(stopId))
        .filter((stop): stop is RawStop => stop != null)
        .map((stop) => ({ id: stop.id, name: stop.name, latitude: stop.latitude, longitude: stop.longitude }))
      const routeStops = assignPolylineIndexes(stopsWithoutIndex, parsedSegments.flat())

      routesByName.set(name, {
        id: routeId,
        name,
        color: meta?.[1] ?? brand.primary,
        code: getBusRouteCode(name),
        segments: parsedSegments,
        stops: routeStops,
      })
    }
  })

  const routes: PassioRoute[] = Array.from(routesByName.values())

  const stops: PassioStop[] = Object.values(data.stops ?? {}).map((stop) => ({
    id: stop.id,
    name: stop.name,
    color: stop.color ?? brand.primary,
    latitude: stop.latitude,
    longitude: stop.longitude,
  }))

  return { routes, stops }
}
