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
  // UGA's regional/research campuses (Griffin, Tifton, Gwinnett, Skidaway) have no GIS layer
  // of their own — fetch-uga-buildings.mjs only queries OUA/UGA_CampusMap_Base, which is
  // Athens-only, and ATHENS_BOUNDS would exclude these coordinates from it even if it did
  // return them. Found via each campus's own class-location strings in the real Schedule of
  // Classes feed (search-uga-classes), then geocoded by street address (OpenStreetMap
  // Nominatim) — approximate at the campus/building level, not surveyed footprints.
  {
    name: 'Griffin Student Learning Center',
    buildingUse: 'Academics',
    // 1109 Experiment Street, Griffin, GA 30223 (UGA Griffin Campus's main address —
    // the SLC itself has no separately geocodable address).
    latitude: 33.2634067,
    longitude: -84.2848812,
  },
  {
    name: 'Tifton Horticulture Building',
    buildingUse: 'Academics',
    // Research Way, Tifton, GA 31793 (per tifton.caes.uga.edu's own facilities page).
    latitude: 31.4762501,
    longitude: -83.5250331,
  },
  {
    name: 'NESPAL',
    buildingUse: 'Academics',
    // 2353 Rainwater Road, Tifton, GA 31793 (National Environmentally Sound Production
    // Agriculture Laboratory, also on the Tifton campus).
    latitude: 31.4750133,
    longitude: -83.5273456,
  },
  {
    name: 'UGA Gwinnett Campus',
    buildingUse: 'Academics',
    // 2530 Sever Road NW, Lawrenceville, GA 30043 (per gwinnett.uga.edu's contact page).
    latitude: 33.9982576,
    longitude: -84.0728697,
  },
  {
    name: 'Skidaway Marine Extension',
    buildingUse: 'Academics',
    // No independently geocodable address for the Marine Extension building itself —
    // anchored to the Skidaway Institute of Oceanography, which shares the same small
    // island/road with UGA Marine Extension's Aquarium a few hundred meters away.
    latitude: 31.9883637,
    longitude: -81.0216933,
  },
  {
    name: 'Flynt Building',
    buildingUse: 'Academics',
    // Griffin campus, "faces Experiment Street" (architects.uga.edu) — no separately
    // geocodable address, anchored to the same campus coordinate as the Griffin Student
    // Learning Center above.
    latitude: 33.2634067,
    longitude: -84.2848812,
  },
  {
    name: 'H. H. Tift Building',
    buildingUse: 'Academics',
    // Tifton campus, "along Research Way ... south of the Old Administration Building"
    // (architects.uga.edu) — same Research Way block as Tifton Horticulture Building above,
    // no more precise address available.
    latitude: 31.4762501,
    longitude: -83.5250331,
  },
  {
    name: 'Environmental Health Sciences',
    buildingUse: 'Academics',
    // South Campus, "adjacent to the Forestry Building" (architects.uga.edu's historic-
    // preservation page for this building) — anchored to Forestry Resources 1's GIS
    // coordinate, its nearest confirmed neighbor. The 150 E Green St address that turns up
    // in general search results is the College of Public Health's administrative/mailing
    // address, not this building's physical footprint (Green St is a different part of
    // campus entirely from the Forestry/South Campus cluster this building sits in).
    latitude: 33.94408307,
    longitude: -83.37467331,
  },
  {
    name: 'West Campus Dining, Learning and Well-being Center',
    buildingUse: 'Student Life',
    // Opened Aug. 2026, too new for the GIS layer — UGA Today describes it as at "East
    // Cloverhurst Avenue and University Court," the same intersection Hillside Dining
    // Commons above is anchored to (they're both on that block).
    latitude: 33.9491,
    longitude: -83.3802,
  },
  {
    name: 'Athena Studios',
    buildingUse: 'Academics',
    // 900 Athena Drive, Athens, GA — the Grady College film/TV production partner
    // facility; geocoded directly (OpenStreetMap has it as a named POI at this address).
    latitude: 33.9703186,
    longitude: -83.3168255,
  },
  {
    name: 'Redding Building',
    buildingUse: 'Academics',
    // 325 Woodroof Dr, Griffin, GA — a distinct street from the Griffin Student Learning
    // Center/Flynt Building anchor above, so geocoded separately rather than reused.
    latitude: 33.2637529,
    longitude: -84.2888615,
  },
  {
    name: 'Broad Street Studios',
    buildingUse: 'Academics',
    // 225 W. Broad St, Athens, GA — Lamar Dodd School of Art's Broad St. Studio building
    // (art.uga.edu/location/225-w-broad-st-athens-ga-30602). Both "Broad St Studio 1" and
    // "Broad St Studio 2" registrar strings anchor here — same building, different rooms.
    latitude: 33.9566197,
    longitude: -83.3786563,
  },
  {
    name: 'Strength Lab',
    buildingUse: 'Academics',
    // STRENGTH Laboratory (Structural Engineering Testing Hub), at the Whitehall
    // Engineering Education and Research Campus, 1151 E. Whitehall Rd, Athens — a newer,
    // separate engineering complex from Driftmier Engineering Center/Annex above, not a
    // typo for the same place (geocoded independently, ~3.5km apart).
    latitude: 33.9056443,
    longitude: -83.3613251,
  },
  {
    name: 'I-STEM 1',
    buildingUse: 'Academics',
    // "At the corner of Cedar Street and East Campus Road" (news.uga.edu/meet-the-i-stem-
    // complex) — anchored to ArcGIS's "Computing Services" building, which sits on that
    // same corner.
    latitude: 33.94518817,
    longitude: -83.37185316,
  },
  {
    name: 'I-STEM 2',
    buildingUse: 'Academics',
    // "Right off East Campus Road" near Davison Life Sciences (same source as I-STEM 1
    // above) — anchored to Davison Life Sciences Complex's GIS coordinate as its nearest
    // confirmed neighbor.
    latitude: 33.94320559,
    longitude: -83.37235379,
  },
  {
    name: 'UGA Pharmacy Program (Augusta)',
    buildingUse: 'Academics',
    // "HM Pharmacy GRU" / "HM-1200" — UGA College of Pharmacy's facility on the Augusta
    // University Health Sciences campus (formerly Georgia Regents University, hence "GRU"),
    // 1120 15th Street, Augusta, GA — an out-of-Athens partner site, not a UGA-owned campus,
    // included anyway per the same "accurate location for every campus" request as the
    // regional campuses above.
    latitude: 33.4694103,
    longitude: -81.9884196,
  },
  {
    name: 'A.B.E.L. Building',
    buildingUse: 'Academics',
    // Aquatic Biotechnology and Environmental Laboratory, Building #2580 — absent from both
    // the GIS layer and UGA's own August 2023 building-index PDF (which jumps straight from
    // #2440 to #2600), so anchored to Whitehall Forest, the research site Warnell's own page
    // names it as being located at (alongside the Whitehall Fisheries Lab).
    latitude: 33.891783,
    longitude: -83.360968,
  },
  {
    name: 'Livestock Instructional Arena',
    buildingUse: 'Academics',
    // 2600 S Milledge Ave, Athens, GA — confirmed by the user; geocoded directly
    // (OpenStreetMap has it as a named POI, "UGA Livestock Instructional Arena").
    latitude: 33.8975541,
    longitude: -83.3681851,
  },
  {
    name: 'Support Services Building',
    buildingUse: 'Support',
    // "Facilities Services (Physical Plant Facilities, Support Services Building)", UGA
    // #4492 (architects.uga.edu) — 1180 East Broad Street, Athens, GA; geocoded directly.
    latitude: 33.958688,
    longitude: -83.3653021,
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
  // Brown Hall itself is a residence hall (no classes held there) — confirmed by the user.
  'joe brown': 'Joseph E. Brown Hall',
  'founders house': 'Founders Garden House',
  // 270 River Rd, Athens, GA 30602 — the Lamar Dodd School of Art's main academic
  // building, per art.uga.edu/about/facilities/main-art-building (the school also uses a
  // few smaller satellite studios elsewhere, which have their own separate GIS entries).
  'main art building': 'Lamar Dodd School of Art',
  'griffin slc': 'Griffin Student Learning Center',
  'horticulture bldg': 'Tifton Horticulture Building',
  'skidaway mar ext': 'Skidaway Marine Extension',
  // Center for Applied Genetic Technologies, 111 Riverbend Rd — same coordinates as ArcGIS's
  // "CAGTECH" entry (confirmed by geocoding that address) and UGA's own August 2023 building
  // index (#2438 CAGTECH).
  'c a g t': 'CAGTECH',
  // Center for Applied Isotope Studies, 120 Riverbend Rd — same coordinates as ArcGIS's
  // "Center for Applied Isotope Studies" entry (confirmed the same way; also #2127 in the
  // building index).
  'c a i s': 'Center for Applied Isotope Studies',
  'dlw center': 'West Campus Dining, Learning and Well-being Center',
  'h. h. tift bldg': 'H. H. Tift Building',
  'enviro health sci': 'Environmental Health Sciences',
  'georgia center c.e': 'Georgia Center for Cont Ed',
  'golf driv rng bld': 'Driving Range Building',
  // ArcGIS has no separate point for the Annex specifically (only the main "Business
  // Services" building), so this anchors to that adjacent building instead — confirmed by
  // the user as being in the same Spring Street area.
  'bus. service annex': 'Business Services',
  'spec coll library': 'Richard B. Russell Jr. Special Collections',
  // Renamed at some point — ArcGIS still calls it "Computing Services", the registrar feed
  // (and Waze/UGA's own a-z location page) still calls it "Statistics & Computer Services".
  'stat/computer srvs': 'Computing Services',
  'broad st studio 1': 'Broad Street Studios',
  'broad st studio 2': 'Broad Street Studios',
  'hm pharmacy gru': 'UGA Pharmacy Program (Augusta)',
  'a b e l': 'A.B.E.L. Building',
  'livest ins arena': 'Livestock Instructional Arena',
  // Renamed from "Moore College" to "Moore Hall" in 2021 (honors.uga.edu) — same building,
  // not to be confused with the separate "Moore-Rooker Hall".
  'moore college': 'Moore Hall',
  // "Ads" here is "Animal Dairy Science" (the Edgar L. Rhodes Center For Animal and Dairy
  // Science), the same Rhodes complex as the "-B"/"-C" aliases above — the trailing wing
  // letter is missing from this particular registrar string (cut off after the dash), so
  // this defaults to wing A rather than being verifiably exact.
  'animal dairy sci -': 'Rhodes Animal Science Center - A',
  // "Ps" = Physical Services, not the "PS - Public Service" fund group it first looked like —
  // confirmed via architects.uga.edu's own page for UGA #4492.
  'ps service bldg a': 'Support Services Building',
  // "Greenhouse Plants Agronomy" and "Greenhouse Plant Pathology" are two separate ArcGIS
  // names, but their closest pair of points is only ~14m apart — the same small greenhouse
  // row on South Campus — so which one "P Agy" abbreviates doesn't actually matter for
  // marker placement; picking one arbitrarily.
  'greenhse res p agy': 'Greenhouse Plants Agronomy',
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
