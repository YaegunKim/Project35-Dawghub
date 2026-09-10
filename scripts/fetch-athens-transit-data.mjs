// Refreshes src/lib/athensTransitData.json from Athens-Clarke County Transit's public GTFS
// feed (bustracker.accgov.com, Avail/AvailTec InfoPoint platform — a separate transit agency
// from UGA's own Passio-based campus buses, see src/lib/passio.ts). Run this by hand whenever
// ACC Transit changes its routes/stops — the app reads the committed JSON, not this live GTFS
// zip, so nothing changes for users until this script is re-run and the result is committed.
// Only route/stop/shape data comes from here; live vehicle positions are a separate
// GTFS-Realtime protobuf feed fetched at runtime (see src/lib/athensTransit.ts).
import { writeFile, mkdtemp, rm } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const GTFS_ZIP_URL = 'https://bustracker.accgov.com/InfoPoint/GTFS-Zip.ashx'

// GTFS text fields are quoted only when they contain a comma (none currently do in this feed,
// but stop/route names are free text so a future refresh could introduce one) — this handles
// that case instead of assuming a plain split(',') stays safe forever.
function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/)
  const header = splitCsvLine(lines[0])
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line)
    return Object.fromEntries(header.map((key, index) => [key, cells[index] ?? '']))
  })
}

function splitCsvLine(line) {
  const cells = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        current += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      cells.push(current)
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current)
  return cells
}

// GTFS ships a shape point every few meters (fine for a transit agency's own high-precision
// rendering) — at the zoom levels this app actually shows the whole county at, that's far more
// detail than visible and roughly doubles the committed JSON's size for no visual gain, so
// Douglas-Peucker simplification thins each shape before it's written out.
const SIMPLIFY_TOLERANCE_METERS = 8

function haversineMeters(a, b) {
  const earthRadiusMeters = 6_371_000
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(b[0] - a[0])
  const dLng = toRad(b[1] - a[1])
  const sinLat = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2
  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(sinLat))
}

// Perpendicular distance from `point` to the line through `start`/`end`, approximated in
// meters by treating the small lat/lng span as locally flat (fine at this tolerance).
function perpendicularDistanceMeters(point, start, end) {
  if (start[0] === end[0] && start[1] === end[1]) return haversineMeters(point, start)
  const metersPerDegLat = 111_320
  const metersPerDegLng = 111_320 * Math.cos((point[0] * Math.PI) / 180)
  const toXY = ([lat, lng]) => [lng * metersPerDegLng, lat * metersPerDegLat]
  const [px, py] = toXY(point)
  const [sx, sy] = toXY(start)
  const [ex, ey] = toXY(end)
  const dx = ex - sx
  const dy = ey - sy
  const lengthSq = dx * dx + dy * dy
  const t = Math.max(0, Math.min(1, ((px - sx) * dx + (py - sy) * dy) / lengthSq))
  const projX = sx + t * dx
  const projY = sy + t * dy
  return Math.hypot(px - projX, py - projY)
}

function simplify(points, toleranceMeters) {
  if (points.length <= 2) return points
  let maxDistance = 0
  let maxIndex = 0
  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistanceMeters(points[i], points[0], points[points.length - 1])
    if (distance > maxDistance) {
      maxDistance = distance
      maxIndex = i
    }
  }
  if (maxDistance <= toleranceMeters) return [points[0], points[points.length - 1]]
  const left = simplify(points.slice(0, maxIndex + 1), toleranceMeters)
  const right = simplify(points.slice(maxIndex), toleranceMeters)
  return [...left.slice(0, -1), ...right]
}

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = join(rootDir, 'src/lib/athensTransitData.json')

const workDir = await mkdtemp(join(tmpdir(), 'athens-transit-gtfs-'))
try {
  const zipPath = join(workDir, 'google_transit.zip')
  const response = await fetch(GTFS_ZIP_URL)
  await writeFile(zipPath, Buffer.from(await response.arrayBuffer()))

  execFileSync('unzip', ['-o', '-q', zipPath, '-d', workDir])

  const readGtfs = (name) => parseCsv(readFileSync(join(workDir, name), 'utf-8'))

  const rawRoutes = readGtfs('routes.txt')
  const rawTrips = readGtfs('trips.txt')
  const rawShapes = readGtfs('shapes.txt')
  const rawStops = readGtfs('stops.txt')

  const shapePointsById = new Map()
  rawShapes.forEach((row) => {
    const list = shapePointsById.get(row.shape_id) ?? []
    list.push({
      seq: Number.parseInt(row.shape_pt_sequence, 10),
      point: [Number.parseFloat(row.shape_pt_lat), Number.parseFloat(row.shape_pt_lon)],
    })
    shapePointsById.set(row.shape_id, list)
  })

  const shapeIdsByRoute = new Map()
  rawTrips.forEach((row) => {
    if (!row.shape_id) return
    const set = shapeIdsByRoute.get(row.route_id) ?? new Set()
    set.add(row.shape_id)
    shapeIdsByRoute.set(row.route_id, set)
  })

  const routes = rawRoutes.map((route) => {
    const shapeIds = Array.from(shapeIdsByRoute.get(route.route_id) ?? [])
    const segments = shapeIds.map((shapeId) => {
      const points = (shapePointsById.get(shapeId) ?? []).sort((a, b) => a.seq - b.seq).map((entry) => entry.point)
      return simplify(points, SIMPLIFY_TOLERANCE_METERS)
    })
    return {
      id: route.route_id,
      shortName: route.route_short_name,
      longName: route.route_long_name,
      color: `#${route.route_color || '333333'}`,
      segments,
    }
  })

  const stops = rawStops
    .filter((stop) => stop.location_type === '0' || stop.location_type === '')
    .map((stop) => ({
      id: stop.stop_id,
      name: stop.stop_name,
      latitude: Number.parseFloat(stop.stop_lat),
      longitude: Number.parseFloat(stop.stop_lon),
    }))
    .filter((stop) => Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude))

  await writeFile(outputPath, `${JSON.stringify({ routes, stops }, null, 2)}\n`)
  console.log(`Wrote ${routes.length} routes and ${stops.length} stops to ${outputPath}`)
} finally {
  await rm(workDir, { recursive: true, force: true })
}
