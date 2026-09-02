import buildingsData from './ugaBuildingsData.json'

export type UgaBuilding = {
  name: string
  buildingUse: string
  latitude: number
  longitude: number
}

// Static snapshot of UGA's ArcGIS building layer (see scripts/fetch-uga-buildings.mjs) rather
// than a live fetch on every session — building footprints barely change between semesters,
// so there's no reason to hit a third-party endpoint (and depend on it being up) every time
// someone opens the map. Re-run that script by hand when campus construction changes the
// building list, and commit the refreshed JSON.
const GIS_BUILDINGS: UgaBuilding[] = buildingsData

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

const ALL_BUILDINGS: UgaBuilding[] = [...GIS_BUILDINGS, ...MANUAL_BUILDINGS]

// Kept async (a resolved Promise) so call sites — most of which already treat this as an
// awaited fetch — don't need to change even though the data is now static and synchronous.
export function fetchUgaBuildings(): Promise<UgaBuilding[]> {
  return Promise.resolve(ALL_BUILDINGS)
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
