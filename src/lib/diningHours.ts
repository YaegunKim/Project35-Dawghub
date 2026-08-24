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
