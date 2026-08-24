const BUILDINGS_URL =
  'https://maps.itos.uga.edu/arcgis/rest/services/OUA/UGA_CampusMap_Base/MapServer/7/query'

const ATHENS_BOUNDS = { minLon: -83.42, maxLon: -83.3, minLat: 33.9, maxLat: 33.98 }

export type UgaBuilding = {
  name: string
  buildingUse: string
  latitude: number
  longitude: number
}

type RawFeature = {
  attributes: {
    NAME?: string
    BuildingUse?: string
    X_DD?: number
    Y_DD?: number
  }
}

async function fetchPage(offset: number): Promise<UgaBuilding[]> {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: 'NAME,BuildingUse,X_DD,Y_DD',
    returnGeometry: 'false',
    f: 'json',
    resultRecordCount: '1000',
    resultOffset: String(offset),
  })

  const response = await fetch(`${BUILDINGS_URL}?${params.toString()}`)
  const data: { features?: RawFeature[] } = await response.json()

  return (data.features ?? [])
    .map((feature) => ({
      name: (feature.attributes.NAME ?? '').trim(),
      buildingUse: feature.attributes.BuildingUse ?? '',
      longitude: feature.attributes.X_DD ?? Number.NaN,
      latitude: feature.attributes.Y_DD ?? Number.NaN,
    }))
    .filter(
      (building) =>
        // Roughly 50 GIS records have a whitespace-only NAME — excluding them here
        // (rather than just checking truthiness) keeps findBuildingByName's substring
        // fallback from matching every multi-word query against a blank name.
        building.name &&
        Number.isFinite(building.latitude) &&
        Number.isFinite(building.longitude) &&
        building.longitude > ATHENS_BOUNDS.minLon &&
        building.longitude < ATHENS_BOUNDS.maxLon &&
        building.latitude > ATHENS_BOUNDS.minLat &&
        building.latitude < ATHENS_BOUNDS.maxLat,
    )
}

// Buildings missing from (or named differently in) the official UGA GIS layer —
// mostly newer construction. Coordinates are best-effort approximations, sourced
// by hand (see comments), not surveyed like the GIS data above.
const MANUAL_BUILDINGS: UgaBuilding[] = [
  {
    name: 'Hillside Dining Commons',
    buildingUse: 'Student Life',
    // Not in the GIS layer (opened 2021). Anchored to the East Cloverhurst Ave /
    // University Court intersection, where UGA Dining describes the building.
    latitude: 33.9491,
    longitude: -83.3802,
  },
  {
    name: 'The Niche',
    buildingUse: 'Student Life',
    // No distinct GIS entry. Located in Scott Hall on the Health Sciences
    // Campus (official address: 104 Spear Rd, Athens, GA 30602).
    latitude: 33.9637,
    longitude: -83.403,
  },
  {
    name: 'Village Summit Dining Commons',
    buildingUse: 'Student Life',
    // Exact — Village Summit dining is on the 2nd floor of Joe Frank Harris Commons.
    latitude: 33.93908655,
    longitude: -83.37082376,
  },
]

let cachedBuildings: Promise<UgaBuilding[]> | null = null

export function fetchUgaBuildings(): Promise<UgaBuilding[]> {
  if (!cachedBuildings) {
    cachedBuildings = Promise.all([fetchPage(0), fetchPage(1000)]).then(([first, second]) => [
      ...first,
      ...second,
      ...MANUAL_BUILDINGS,
    ])
  }
  return cachedBuildings
}

export function findBuildingByName(buildings: UgaBuilding[], query: string): UgaBuilding | undefined {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return undefined

  return (
    buildings.find((building) => building.name.toLowerCase() === normalized) ??
    buildings.find((building) => building.name.toLowerCase().includes(normalized)) ??
    buildings.find((building) => normalized.includes(building.name.toLowerCase()))
  )
}

export const LIBRARY_BUILDING_NAMES = [
  'Main Library',
  'Shirley Mathis McBay Science Library',
  'Law Library Annex',
  'Carnegie Library Learning Center',
  'Zell B. Miller Learning Center',
  'Richard B. Russell Jr. Special Collections',
  'Lamar Dodd School of Art',
  'Hugh Hodgson School of Music',
  'Aderhold Hall',
]

export const DINING_BUILDING_NAMES = [
  'Bolton Dining Commons',
  'Oglethorpe Dining Commons',
  'Snelling Dining Hall',
  'Hillside Dining Commons',
  'The Niche',
  'Village Summit Dining Commons',
]

// Pound Hall and Wheeler Hall are two adjacent buildings that share one gym
// facility ("Pound Hall & Wheeler Gym") with a single operating-hours schedule —
// only one pin is placed for it.
export const GYM_BUILDING_NAMES = ['Ramsey Center', 'Pound Hall']
