import type { EventBridgeHandler } from 'aws-lambda'

// The Amplify Data client's `client.models.X` needs a modelIntrospection schema that's
// normally baked in from amplify_outputs.json — this function has neither that file nor
// a $amplify/env data-client config (see resource.ts's `schedule`), so `client.models` came
// back undefined at runtime. Calling AppSync's GraphQL endpoint directly over HTTP with the
// apiKey header sidesteps the client entirely and needs no introspection.
type CreateBusStopArrivalInput = {
  busId: string
  routeName: string
  stopId: string
  stopName: string
  arrivedAt: string
  latitude: number
  longitude: number
}

const CREATE_BUS_STOP_ARRIVAL_MUTATION = `
  mutation CreateBusStopArrival($input: CreateBusStopArrivalInput!) {
    createBusStopArrival(input: $input) { id }
  }
`

async function createBusStopArrival(input: CreateBusStopArrivalInput) {
  const response = await fetch(process.env.GRAPHQL_ENDPOINT!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.GRAPHQL_API_KEY!,
    },
    body: JSON.stringify({ query: CREATE_BUS_STOP_ARRIVAL_MUTATION, variables: { input } }),
  })
  const result: { errors?: unknown[] } = await response.json()
  if (result.errors?.length) {
    throw new Error(`createBusStopArrival failed: ${JSON.stringify(result.errors)}`)
  }
}

const UGA_PASSIO_SYSTEM_ID = '3994'
// A bus is considered "at" a stop once it's within this radius — loose enough to tolerate
// Passio's GPS jitter without needing a precise geofence.
const ARRIVAL_RADIUS_METERS = 30

type RawPassioBus = {
  latitude?: string
  longitude?: string
  route?: string
}

type LiveBus = {
  id: string
  route: string
  latitude: number
  longitude: number
}

async function fetchBuses(): Promise<LiveBus[]> {
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
        latitude: Number.parseFloat(bus.latitude ?? ''),
        longitude: Number.parseFloat(bus.longitude ?? ''),
      }
    })
    .filter((bus) => bus.route && Number.isFinite(bus.latitude) && Number.isFinite(bus.longitude))
}

function haversineDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadiusMeters = 6_371_000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(a))
}

type RouteStop = {
  id: string
  name: string
  latitude: number
  longitude: number
  // This stop's position within the route's own flattened GPS trace — see
  // assignPolylineIndexes. Ported from src/lib/passio.ts's client-side ETA computation, which
  // needs this same "how far along the route is X" primitive; duplicated rather than imported
  // to keep this Lambda self-contained (see the file-level comment on the GraphQL client).
  polylineIndex: number
}

type Route = {
  name: string
  // Flattened GPS trace of the whole loop, in travel order.
  flatPoints: [number, number][]
  // Resolved from the route's own ordered stop sequence (Passio's per-route data), not from
  // each stop's own `routeName` tag — that tag is unreliable (confirmed: none of Central
  // East's 19 real stops are tagged routeName "Central East"), so grouping stops by it instead
  // of the route's actual sequence silently missed most of a route's real stops.
  stops: RouteStop[]
}

const POLYLINE_MATCH_IMPROVEMENT_THRESHOLD_METERS = 10

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
      const distance = haversineDistanceMeters(stop.latitude, stop.longitude, lat, lng)
      if (distance < bestDistance - POLYLINE_MATCH_IMPROVEMENT_THRESHOLD_METERS) {
        bestDistance = distance
        bestIndex = index
      }
    }
    searchStart = bestIndex
    return { ...stop, polylineIndex: bestIndex }
  })
}

function nearestPolylineIndex(lat: number, lng: number, flatPoints: [number, number][]): number {
  let bestIndex = 0
  let bestDistance = Infinity
  flatPoints.forEach(([pointLat, pointLng], index) => {
    const distance = haversineDistanceMeters(lat, lng, pointLat, pointLng)
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  })
  return bestIndex
}

// Routes are closed loops, so distance is always measured walking forward from fromIndex,
// wrapping around to 0 rather than "backing up" to a smaller index — see passio.ts's own
// comment on why a plain index subtraction is wrong for a loop.
function distanceAlongLoopMeters(flatPoints: [number, number][], fromIndex: number, toIndex: number): number {
  let total = 0
  let i = fromIndex
  while (i !== toIndex) {
    const next = (i + 1) % flatPoints.length
    const [lat1, lng1] = flatPoints[i]
    const [lat2, lng2] = flatPoints[next]
    total += haversineDistanceMeters(lat1, lng1, lat2, lng2)
    i = next
  }
  return total
}

type RawStop = { id: string; name: string; latitude: number; longitude: number }
type RawRoutePoint = { lat: string; lng: string }
type RawStopsResponse = {
  stops?: Record<string, RawStop>
  routes?: Record<string, [string, string, ...unknown[]]>
  routePoints?: Record<string, RawRoutePoint[][]>
}

async function fetchRoutes(): Promise<Map<string, Route>> {
  const response = await fetch('https://passiogo.com/mapGetData.php?getStops=2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ s0: UGA_PASSIO_SYSTEM_ID, sA: 1 }),
  })
  const data: RawStopsResponse = await response.json()

  const stopById = new Map<string, RawStop>()
  Object.values(data.stops ?? {}).forEach((stop) => stopById.set(stop.id, stop))

  // Passio sometimes serves the same physical route under multiple routeIds with an identical
  // display name — group by trimmed name (mirrors src/lib/passio.ts's fetchUgaRoutesAndStops).
  const routesByName = new Map<string, Route>()
  Object.entries(data.routePoints ?? {}).forEach(([routeId, segments]) => {
    const meta = data.routes?.[routeId]
    const name = (meta?.[0] ?? '').trim()
    const flatPoints = segments.flat().map((point) => [Number.parseFloat(point.lat), Number.parseFloat(point.lng)] as [number, number])

    const existing = routesByName.get(name)
    if (existing) {
      existing.flatPoints.push(...flatPoints)
      return
    }

    // meta beyond [name, color] is Passio's own ordered stop sequence: [order, stopId, flag][].
    // The loop's closing entry repeats the first stop id — drop it so each stop appears once.
    const sequenceEntries = (meta?.slice(2) ?? []) as [string, string, number][]
    const stopIds = sequenceEntries.map(([, stopId]) => stopId)
    const dedupedStopIds = stopIds.length > 1 && stopIds[stopIds.length - 1] === stopIds[0] ? stopIds.slice(0, -1) : stopIds
    const stopsWithoutIndex = dedupedStopIds
      .map((stopId) => stopById.get(stopId))
      .filter((stop): stop is RawStop => stop != null)
      .map((stop) => ({ id: stop.id, name: stop.name, latitude: stop.latitude, longitude: stop.longitude }))

    routesByName.set(name, { name, flatPoints, stops: assignPolylineIndexes(stopsWithoutIndex, flatPoints) })
  })

  return routesByName
}

// A bus can't plausibly cover more ground than this between two polls — guards against a
// bogus interpolation when the nearest-point match snaps slightly backwards (GPS jitter on a
// stationary bus) and the forward-only, wrap-at-the-loop distanceAlongLoopMeters would
// otherwise read that as "went nearly all the way around."
const MAX_PLAUSIBLE_SPEED_METERS_PER_SECOND = 15

type BusSnapshot = { routeName: string; polylineIndex: number; latitude: number; longitude: number; timestampMs: number }

// Writes one row per (bus, stop) pair currently within ARRIVAL_RADIUS_METERS — including
// repeats while a bus lingers at a stop across several polls. Deduping into discrete "visits"
// happens later at stats time (cluster consecutive rows per bus+stop), not here, so this stays
// a dumb append-only writer with no read-before-write.
//
// Additionally, for any bus with a snapshot from the *previous* poll on the same route, infers
// stops the bus passed through in between without either poll catching it within range: if a
// stop sits strictly between the two polls' positions along the route's real GPS trace, its
// arrival time is linearly interpolated by how far along that gap the stop sits (e.g. a stop
// 40m past the previous position out of a 100m total gap arrives 40% of the way through the
// elapsed time). This can only bridge gaps between polls *within* one Lambda invocation (see
// POLL_COUNT/POLL_INTERVAL_MS below) — this function has no persisted state across separate
// invocations, so the ~20s gap that crosses a one-minute EventBridge boundary stays uncovered.
async function pollOnce(routes: Map<string, Route>, previousBuses: Map<string, BusSnapshot>): Promise<void> {
  const buses = await fetchBuses()
  if (buses.length === 0) return

  const nowMs = Date.now()
  const arrivedAt = new Date(nowMs).toISOString()
  const writes: Promise<void>[] = []

  buses.forEach((bus) => {
    const route = routes.get(bus.route)
    if (!route) {
      previousBuses.delete(bus.id)
      return
    }

    route.stops
      .filter((stop) => haversineDistanceMeters(bus.latitude, bus.longitude, stop.latitude, stop.longitude) <= ARRIVAL_RADIUS_METERS)
      .forEach((stop) => {
        writes.push(
          createBusStopArrival({
            busId: bus.id,
            routeName: bus.route,
            stopId: stop.id,
            stopName: stop.name,
            arrivedAt,
            latitude: bus.latitude,
            longitude: bus.longitude,
          }),
        )
      })

    const currentIndex = nearestPolylineIndex(bus.latitude, bus.longitude, route.flatPoints)
    const previous = previousBuses.get(bus.id)

    if (previous && previous.routeName === bus.route) {
      const elapsedSeconds = (nowMs - previous.timestampMs) / 1000
      const distancePrevToCurrent = distanceAlongLoopMeters(route.flatPoints, previous.polylineIndex, currentIndex)

      if (elapsedSeconds > 0 && distancePrevToCurrent <= elapsedSeconds * MAX_PLAUSIBLE_SPEED_METERS_PER_SECOND) {
        route.stops.forEach((stop) => {
          // Only infer a stop neither poll's direct radius check could have caught — otherwise
          // this just adds a near-duplicate of a row already written above.
          const clearOfPrevious = haversineDistanceMeters(previous.latitude, previous.longitude, stop.latitude, stop.longitude) > ARRIVAL_RADIUS_METERS
          const clearOfCurrent = haversineDistanceMeters(bus.latitude, bus.longitude, stop.latitude, stop.longitude) > ARRIVAL_RADIUS_METERS
          if (!clearOfPrevious || !clearOfCurrent) return

          const distancePrevToStop = distanceAlongLoopMeters(route.flatPoints, previous.polylineIndex, stop.polylineIndex)
          if (distancePrevToStop <= 0 || distancePrevToStop >= distancePrevToCurrent) return

          const fraction = distancePrevToStop / distancePrevToCurrent
          const interpolatedAt = new Date(previous.timestampMs + fraction * (nowMs - previous.timestampMs)).toISOString()

          writes.push(
            createBusStopArrival({
              busId: bus.id,
              routeName: bus.route,
              stopId: stop.id,
              stopName: stop.name,
              arrivedAt: interpolatedAt,
              latitude: stop.latitude,
              longitude: stop.longitude,
            }),
          )
        })
      }
    }

    previousBuses.set(bus.id, { routeName: bus.route, polylineIndex: currentIndex, latitude: bus.latitude, longitude: bus.longitude, timestampMs: nowMs })
  })

  // allSettled, not all — one bad write shouldn't sink the rest of this poll's rows.
  const results = await Promise.allSettled(writes)
  results.forEach((result) => {
    if (result.status === 'rejected') console.error(result.reason)
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// EventBridge only triggers this once a minute (see resource.ts — its schedule rate can't go
// below 1 minute), but a bus can pass clean through a stop's ARRIVAL_RADIUS_METERS between two
// 1-minute-apart polls without ever being caught. Polling a few times per invocation, spaced
// out, gets a finer-grained sample without needing a faster trigger — and lets consecutive
// polls within the same invocation interpolate stops passed in between (see pollOnce).
const POLL_COUNT = 3
const POLL_INTERVAL_MS = 20_000

export const handler: EventBridgeHandler<'Scheduled Event', null, void> = async () => {
  const routes = await fetchRoutes()
  const previousBuses = new Map<string, BusSnapshot>()

  for (let i = 0; i < POLL_COUNT; i++) {
    try {
      await pollOnce(routes, previousBuses)
    } catch (error) {
      console.error(error)
    }
    if (i < POLL_COUNT - 1) await sleep(POLL_INTERVAL_MS)
  }
}
