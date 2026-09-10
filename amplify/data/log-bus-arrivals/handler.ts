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

type RawStop = {
  id: string
  name: string
  latitude: number
  longitude: number
  routeName?: string
}

type Stop = {
  id: string
  name: string
  latitude: number
  longitude: number
  routeName: string
}

async function fetchStops(): Promise<Stop[]> {
  const response = await fetch('https://passiogo.com/mapGetData.php?getStops=2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ s0: UGA_PASSIO_SYSTEM_ID, sA: 1 }),
  })
  const data: { stops?: Record<string, RawStop> } = await response.json()

  return Object.values(data.stops ?? {}).map((stop) => ({
    id: stop.id,
    name: stop.name,
    latitude: stop.latitude,
    longitude: stop.longitude,
    routeName: stop.routeName?.trim() ?? '',
  }))
}

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadiusMeters = 6_371_000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(a))
}

// Writes one row per (bus, stop) pair currently within range — including repeats while a bus
// lingers at a stop across several polls. Deduping into discrete "visits" happens later at
// stats time (cluster consecutive rows per bus+stop), not here, so this stays a dumb
// append-only writer with no read-before-write.
async function pollOnce(): Promise<void> {
  const [buses, stops] = await Promise.all([fetchBuses(), fetchStops()])
  if (buses.length === 0 || stops.length === 0) return

  const stopsByRoute = new Map<string, Stop[]>()
  stops.forEach((stop) => {
    const list = stopsByRoute.get(stop.routeName) ?? []
    list.push(stop)
    stopsByRoute.set(stop.routeName, list)
  })

  const arrivedAt = new Date().toISOString()

  const writes = buses.flatMap((bus) => {
    const routeStops = stopsByRoute.get(bus.route) ?? []
    return routeStops
      .filter((stop) => distanceMeters(bus.latitude, bus.longitude, stop.latitude, stop.longitude) <= ARRIVAL_RADIUS_METERS)
      .map((stop) =>
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
// out, gets a finer-grained sample without needing a faster trigger.
const POLL_COUNT = 3
const POLL_INTERVAL_MS = 20_000

export const handler: EventBridgeHandler<'Scheduled Event', null, void> = async () => {
  for (let i = 0; i < POLL_COUNT; i++) {
    try {
      await pollOnce()
    } catch (error) {
      console.error(error)
    }
    if (i < POLL_COUNT - 1) await sleep(POLL_INTERVAL_MS)
  }
}
