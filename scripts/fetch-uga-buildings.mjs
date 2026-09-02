// Refreshes src/lib/ugaBuildingsData.json from UGA's live ArcGIS building layer. Run this by
// hand whenever campus construction changes the building list (new buildings, renames,
// demolitions) — the app itself reads the committed JSON, not this live endpoint, so nothing
// changes for users until this script is re-run and the result is committed. See
// src/lib/ugaBuildings.ts for how MANUAL_BUILDINGS (buildings missing from this GIS layer
// entirely) stays separate and hand-maintained.
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const BUILDINGS_URL = 'https://maps.itos.uga.edu/arcgis/rest/services/OUA/UGA_CampusMap_Base/MapServer/7/query'
const ATHENS_BOUNDS = { minLon: -83.42, maxLon: -83.3, minLat: 33.9, maxLat: 33.98 }

async function fetchPage(offset) {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: 'NAME,BuildingUse,X_DD,Y_DD',
    returnGeometry: 'false',
    f: 'json',
    resultRecordCount: '1000',
    resultOffset: String(offset),
  })

  const response = await fetch(`${BUILDINGS_URL}?${params.toString()}`)
  const data = await response.json()

  return (data.features ?? [])
    .map((feature) => ({
      name: (feature.attributes.NAME ?? '').trim(),
      buildingUse: feature.attributes.BuildingUse ?? '',
      longitude: feature.attributes.X_DD ?? Number.NaN,
      latitude: feature.attributes.Y_DD ?? Number.NaN,
    }))
    .filter(
      (building) =>
        // Roughly 50 GIS records have a whitespace-only NAME — excluding them here (rather
        // than just checking truthiness) keeps findBuildingByName's substring fallback from
        // matching every multi-word query against a blank name.
        building.name &&
        Number.isFinite(building.latitude) &&
        Number.isFinite(building.longitude) &&
        building.longitude > ATHENS_BOUNDS.minLon &&
        building.longitude < ATHENS_BOUNDS.maxLon &&
        building.latitude > ATHENS_BOUNDS.minLat &&
        building.latitude < ATHENS_BOUNDS.maxLat,
    )
}

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = join(rootDir, 'src/lib/ugaBuildingsData.json')

const [first, second] = await Promise.all([fetchPage(0), fetchPage(1000)])
const buildings = [...first, ...second]

await writeFile(outputPath, `${JSON.stringify(buildings, null, 2)}\n`)
console.log(`Wrote ${buildings.length} buildings to ${outputPath}`)
