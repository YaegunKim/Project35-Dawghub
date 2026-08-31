// Source: https://dining.uga.edu/locations/dining-commons/ — static HTML text on UGA
// Dining's own site (no public API, no CORS). Transcribed manually; refresh if UGA
// changes hours (semester breaks, holidays) since there's no exception data published.

export type DiningHall = 'bolton' | 'hillside' | 'oglethorpe' | 'snelling' | 'niche' | 'villageSummit'

const DINING_HOURS: Record<DiningHall, Record<number, string>> = {
  bolton: {
    0: 'Closed',
    1: '7:00am–10:00pm',
    2: '7:00am–10:00pm',
    3: '7:00am–10:00pm',
    4: '7:00am–10:00pm',
    5: '7:00am–10:00pm',
    6: '8:30am–10:00pm',
  },
  hillside: {
    0: '8:30am–10:00pm',
    1: '7:00am–2:00am',
    2: '7:00am–2:00am',
    3: '7:00am–2:00am',
    4: '7:00am–2:00am',
    5: '7:00am–9:00pm',
    6: 'Closed',
  },
  oglethorpe: {
    0: '4:00pm–9:00pm',
    1: '7:00am–9:00pm',
    2: '7:00am–9:00pm',
    3: '7:00am–9:00pm',
    4: '7:00am–9:00pm',
    5: '7:00am–2:30pm',
    6: 'Closed',
  },
  snelling: {
    0: 'Closed',
    1: '7:00am–3:00pm',
    2: '7:00am–3:00pm',
    3: '7:00am–3:00pm',
    4: '7:00am–3:00pm',
    5: '7:00am–3:00pm',
    6: 'Closed',
  },
  niche: {
    0: 'Closed',
    1: '7:00am–2:30pm (dinner 5–7pm, HSC residents only)',
    2: '7:00am–2:30pm (dinner 5–7pm, HSC residents only)',
    3: '7:00am–2:30pm (dinner 5–7pm, HSC residents only)',
    4: '7:00am–2:30pm (dinner 5–7pm, HSC residents only)',
    5: '7:00am–2:30pm (dinner 5–7pm, HSC residents only)',
    6: 'Closed',
  },
  villageSummit: {
    0: '8:30am–9:00pm',
    1: '7:00am–9:00pm',
    2: '7:00am–9:00pm',
    3: '7:00am–9:00pm',
    4: '7:00am–9:00pm',
    5: '7:00am–9:00pm',
    6: '8:30am–9:00pm',
  },
}

export function getDiningHoursToday(hall: DiningHall, date: Date = new Date()): string {
  return DINING_HOURS[hall][date.getDay()]
}

// Some entries above/below carry a trailing "(...)" caveat (e.g. Niche's "HSC residents only")
// that reads awkwardly crammed onto the same line as the time range — this splits it out so the
// UI can render it as its own row instead.
export function splitHoursNote(hours: string): { hours: string; note: string | null } {
  const match = hours.match(/^(.*?)\s*\(([^)]+)\)\s*$/)
  return match ? { hours: match[1], note: match[2] } : { hours, note: null }
}

// Per-meal-period breakdown, transcribed from each hall's own page (dining.uga.edu/location/<hall>/) —
// the combined /locations/dining-commons/ listing only has the merged open-close ranges above. Cross-checked
// that every entry here sums back to the matching DINING_HOURS range for the same hall/day.
type MealPeriodHours = { breakfast: string; lunch: string; dinner: string }

const DINING_MEAL_HOURS: Record<DiningHall, Record<number, MealPeriodHours>> = {
  bolton: {
    0: { breakfast: 'Closed', lunch: 'Closed', dinner: 'Closed' },
    1: { breakfast: '7:00am–10:30am', lunch: '10:30am–4:00pm', dinner: '4:00pm–10:00pm' },
    2: { breakfast: '7:00am–10:30am', lunch: '10:30am–4:00pm', dinner: '4:00pm–10:00pm' },
    3: { breakfast: '7:00am–10:30am', lunch: '10:30am–4:00pm', dinner: '4:00pm–10:00pm' },
    4: { breakfast: '7:00am–10:30am', lunch: '10:30am–4:00pm', dinner: '4:00pm–10:00pm' },
    5: { breakfast: '7:00am–10:30am', lunch: '10:30am–4:00pm', dinner: '4:00pm–10:00pm' },
    6: { breakfast: '8:30am–11:30am', lunch: '11:30am–4:00pm', dinner: '4:00pm–10:00pm' },
  },
  hillside: {
    0: { breakfast: '8:30am–11:30am', lunch: '11:30am–4:00pm', dinner: '4:00pm–10:00pm' },
    1: { breakfast: '7:00am–10:30am', lunch: '10:30am–4:00pm', dinner: '4:00pm–10:00pm' },
    2: { breakfast: '7:00am–10:30am', lunch: '10:30am–4:00pm', dinner: '4:00pm–10:00pm' },
    3: { breakfast: '7:00am–10:30am', lunch: '10:30am–4:00pm', dinner: '4:00pm–10:00pm' },
    4: { breakfast: '7:00am–10:30am', lunch: '10:30am–4:00pm', dinner: '4:00pm–10:00pm' },
    5: { breakfast: '7:00am–10:30am', lunch: '10:30am–4:00pm', dinner: '4:00pm–9:00pm' },
    6: { breakfast: 'Closed', lunch: 'Closed', dinner: 'Closed' },
  },
  oglethorpe: {
    0: { breakfast: 'Closed', lunch: 'Closed', dinner: '4:00pm–9:00pm' },
    1: { breakfast: '7:00am–10:30am', lunch: '10:30am–4:00pm', dinner: '4:00pm–9:00pm' },
    2: { breakfast: '7:00am–10:30am', lunch: '10:30am–4:00pm', dinner: '4:00pm–9:00pm' },
    3: { breakfast: '7:00am–10:30am', lunch: '10:30am–4:00pm', dinner: '4:00pm–9:00pm' },
    4: { breakfast: '7:00am–10:30am', lunch: '10:30am–4:00pm', dinner: '4:00pm–9:00pm' },
    5: { breakfast: '7:00am–10:30am', lunch: '10:30am–2:30pm', dinner: 'Closed' },
    6: { breakfast: 'Closed', lunch: 'Closed', dinner: 'Closed' },
  },
  snelling: {
    0: { breakfast: 'Closed', lunch: 'Closed', dinner: 'Closed' },
    1: { breakfast: '7:00am–10:30am', lunch: '10:30am–3:00pm', dinner: 'Closed' },
    2: { breakfast: '7:00am–10:30am', lunch: '10:30am–3:00pm', dinner: 'Closed' },
    3: { breakfast: '7:00am–10:30am', lunch: '10:30am–3:00pm', dinner: 'Closed' },
    4: { breakfast: '7:00am–10:30am', lunch: '10:30am–3:00pm', dinner: 'Closed' },
    5: { breakfast: '7:00am–10:30am', lunch: '10:30am–3:00pm', dinner: 'Closed' },
    6: { breakfast: 'Closed', lunch: 'Closed', dinner: 'Closed' },
  },
  niche: {
    0: { breakfast: 'Closed', lunch: 'Closed', dinner: 'Closed' },
    1: { breakfast: '7:00am–10:00am', lunch: '10:00am–2:30pm', dinner: '5:00pm–7:00pm (HSC residents only)' },
    2: { breakfast: '7:00am–10:00am', lunch: '10:00am–2:30pm', dinner: '5:00pm–7:00pm (HSC residents only)' },
    3: { breakfast: '7:00am–10:00am', lunch: '10:00am–2:30pm', dinner: '5:00pm–7:00pm (HSC residents only)' },
    4: { breakfast: '7:00am–10:00am', lunch: '10:00am–2:30pm', dinner: '5:00pm–7:00pm (HSC residents only)' },
    5: { breakfast: '7:00am–10:00am', lunch: '10:00am–2:30pm', dinner: '5:00pm–7:00pm (HSC residents only)' },
    6: { breakfast: 'Closed', lunch: 'Closed', dinner: 'Closed' },
  },
  villageSummit: {
    0: { breakfast: '8:30am–11:30am', lunch: '11:30am–4:00pm', dinner: '4:00pm–9:00pm' },
    1: { breakfast: '7:00am–10:30am', lunch: '10:30am–4:00pm', dinner: '4:00pm–9:00pm' },
    2: { breakfast: '7:00am–10:30am', lunch: '10:30am–4:00pm', dinner: '4:00pm–9:00pm' },
    3: { breakfast: '7:00am–10:30am', lunch: '10:30am–4:00pm', dinner: '4:00pm–9:00pm' },
    4: { breakfast: '7:00am–10:30am', lunch: '10:30am–4:00pm', dinner: '4:00pm–9:00pm' },
    5: { breakfast: '7:00am–10:30am', lunch: '10:30am–4:00pm', dinner: '4:00pm–9:00pm' },
    6: { breakfast: '8:30am–11:30am', lunch: '11:30am–4:00pm', dinner: '4:00pm–9:00pm' },
  },
}

export function getDiningMealHoursToday(
  hall: DiningHall,
  meal: 'breakfast' | 'lunch' | 'dinner',
  date: Date = new Date(),
): string {
  return DINING_MEAL_HOURS[hall][date.getDay()][meal]
}

const DINING_BUILDING_TO_HALL: Record<string, DiningHall> = {
  'Bolton Dining Commons': 'bolton',
  'Oglethorpe Dining Commons': 'oglethorpe',
  'Snelling Dining Hall': 'snelling',
  'Hillside Dining Commons': 'hillside',
  'The Niche': 'niche',
  'Village Summit Dining Commons': 'villageSummit',
}

export function getDiningHoursTodayByBuildingName(buildingName: string, date: Date = new Date()): string | null {
  const hall = DINING_BUILDING_TO_HALL[buildingName]
  return hall ? getDiningHoursToday(hall, date) : null
}

export function getDiningHallByBuildingName(buildingName: string): DiningHall | null {
  return DINING_BUILDING_TO_HALL[buildingName] ?? null
}
