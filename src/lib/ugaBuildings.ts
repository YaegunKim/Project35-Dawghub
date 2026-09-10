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

// The registrar's course-search location strings (ClassEntry.location, e.g. "Journalism
// 0501") append a trailing room number after the building name — the three checks above
// only catch a building name that appears somewhere in the full string, not one that's a
// mere *prefix* of it, so "Journalism Building" never matched "Journalism 0501" even though
// the intent is obvious. Stripping that trailing token and retrying with a prefix check
// covers this without touching the exact/substring checks (which still run first).
function stripTrailingRoomToken(normalized: string): string {
  return normalized.replace(/\s+[\w-]*\d[\w-]*$/, '').trim()
}

// Manually confirmed mappings for registrar location strings whose abbreviation scheme
// diverges too far from the ArcGIS building name for any generic text match to bridge —
// "Cntr"/"Ads"/"Rsrch"/"Inst" are abbreviated completely differently (or not at all) on the
// ArcGIS side. Sourced by cross-checking every distinct MEETING_TIME.BUILDING_DESC value in
// UGA's real Schedule-of-Classes CSV (apps.reg.uga.edu/soc — the same feed search-uga-classes
// reads) against the ArcGIS building list, so this covers real registrar abbreviations rather
// than ones guessed in the abstract. Keys are lowercase and are checked against both the full
// registrar string and its room-number-stripped form.
const BUILDING_NAME_ALIASES: Record<string, string> = {
  'rhodes cntr ads -b': 'Rhodes Animal Science Center - B',
  'rhodes cntr ads -c': 'Rhodes Animal Science Center - C',
  'inst plaza': 'Instructional Plaza',
  'boyd research & education ctr': 'Boyd Rsrch and Edu Ctr',
  // Poultry Science's teaching space is physically inside Conner Hall, not one of ArcGIS's
  // many separate standalone "Poultry Science ___" buildings (those are the ag-research farm
  // buildings out at the poultry farm) — not derivable from the name, confirmed by the user.
  'poultry science bldg.': 'Conner Hall',
  '105 bowstrom rd': '105 Bowstrom Road',
  'consumer rsch cntr': 'Housing and Consumer Research Center',
  'driftmier eng ctr': 'Driftmier Engineering Center',
  'family sci ctr i': 'Family Science Center 1',
  'geography geology': 'Geography and Geology',
  'jackson st bldg': 'Jackson Street Building',
  'marine sci - dance': 'Marine Science / Dance',
  'military,army rotc': 'Military Building Army ROTC',
  'ramsey stu ctr pa': 'Ramsey Center',
  'rutherford hal new': 'Rutherford Hall',
  'schwab financial planning cntr': 'Charles Schwab Financial Planning Center',
  'child devel. lab': 'Child Development Laboratory',
  'music building': 'Hugh Hodgson School of Music',
  'riverbend rsch s': 'Riverbend Research Lab South',
  'robt c wilson phar': 'R. C. Wilson Pharmacy',
  'thomas st sculp': 'Thomas Street Sculpture',
  'thomas st., south': 'Thomas Street South',
  'vet med - 1': 'College of Veterinary Medicine 1',
  'jewelry&metalwork': 'Jewelry & Metalwork Art Studios',
  'performng arts ctr': 'Performing Arts',
  'ga mus of art pvac': 'Georgia Museum of Art',
  'life sci f.davison': 'Davison Life Sciences Complex',
}

// A handful of registrar building strings differ from the ArcGIS name only in punctuation
// (e.g. "Zell B Miller Learning Center" vs. "Zell B. Miller Learning Center") — stripping
// periods/commas from both sides is safe precisely because it's applied symmetrically, unlike
// a one-sided guess.
function stripPunctuation(value: string): string {
  return value.replace(/[.,]/g, '').replace(/\s+/g, ' ').trim()
}

export function findBuildingByName(buildings: UgaBuilding[], query: string): UgaBuilding | undefined {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return undefined

  const withoutRoom = stripTrailingRoomToken(normalized)
  const aliasTarget = BUILDING_NAME_ALIASES[normalized] ?? BUILDING_NAME_ALIASES[withoutRoom]
  const aliased = aliasTarget ? buildings.find((building) => building.name === aliasTarget) : undefined
  if (aliased) return aliased

  const direct =
    buildings.find((building) => building.name.toLowerCase() === normalized) ??
    buildings.find((building) => building.name.toLowerCase().includes(normalized)) ??
    buildings.find((building) => normalized.includes(building.name.toLowerCase()))
  if (direct) return direct

  const normalizedNoPunct = stripPunctuation(normalized)
  const noPunctMatch = buildings.find((building) => stripPunctuation(building.name.toLowerCase()) === normalizedNoPunct)
  if (noPunctMatch) return noPunctMatch

  if (withoutRoom === normalized || !withoutRoom) return undefined

  return (
    buildings.find((building) => building.name.toLowerCase() === withoutRoom) ??
    buildings.find((building) => building.name.toLowerCase().startsWith(withoutRoom)) ??
    buildings.find((building) => withoutRoom.includes(building.name.toLowerCase()))
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
