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

const MEAL_ORDER: ('breakfast' | 'lunch' | 'dinner')[] = ['breakfast', 'lunch', 'dinner']

type TimeRange = { start: number; end: number }

// Parses just the leading "H:MMam–H:MMpm" part of an hours string, ignoring any trailing
// "(...)" caveat (see splitHoursNote) and returning null for "Closed" or unparseable strings.
// If the close time is <= the open time, treat it as past midnight (e.g. "7:00am–2:00am" is
// open from 7am today to 2am *tomorrow*, i.e. minute 1560, not minute 120).
function parseHourRange(hours: string): TimeRange | null {
  const match = hours.match(/(\d{1,2}):(\d{2})(am|pm)\s*[–-]\s*(\d{1,2}):(\d{2})(am|pm)/i)
  if (!match) return null
  const [, startHour, startMin, startAmPm, endHour, endMin, endAmPm] = match
  const start = toMinutesSinceMidnight(startHour, startMin, startAmPm)
  let end = toMinutesSinceMidnight(endHour, endMin, endAmPm)
  if (end <= start) end += 24 * 60
  return { start, end }
}

function toMinutesSinceMidnight(hour: string, minute: string, amPm: string): number {
  const h = Number.parseInt(hour, 10) % 12
  return (amPm.toLowerCase() === 'pm' ? h + 12 : h) * 60 + Number.parseInt(minute, 10)
}

function formatMinutesSinceMidnight(totalMinutes: number): string {
  const h24 = Math.floor(totalMinutes / 60) % 24
  const minute = totalMinutes % 60
  const hour = h24 % 12 || 12
  return `${hour}:${String(minute).padStart(2, '0')}${h24 < 12 ? 'am' : 'pm'}`
}

// Combines the per-meal ranges with the overall merged range for the day — neither alone is
// enough. Per-meal-only misses Hillside's "late night" 10pm–2am window, since that's not one of
// the three tracked meal periods but IS part of the overall DINING_HOURS range. Overall-only
// misses Niche's dinner, since Niche's overall entry is just the breakfast/lunch span (dinner is
// only mentioned in its trailing "(...)" note, not the parsed range) — and would also miss the
// real gap between Niche's lunch and dinner. Taking the union of both sources covers both cases;
// duplicated/overlapping ranges are harmless since callers only need "is `now` inside ANY of
// these" or "what's the earliest future start among ALL of these", not a merged interval set.
function allRangesForDay(hall: DiningHall, date: Date): TimeRange[] {
  const mealRanges = MEAL_ORDER.map((meal) => parseHourRange(getDiningMealHoursToday(hall, meal, date)))
  const overallRange = parseHourRange(getDiningHoursToday(hall, date))
  return [...mealRanges, overallRange].filter((range): range is TimeRange => range !== null)
}

// Checks actual meal windows (not just the merged all-day range) so a hall with a midday gap
// between meals — e.g. Niche closes 2:30pm–5pm between lunch and dinner — is correctly "closed"
// in that gap instead of looking open just because it's within the day's overall first-to-last
// span. See allRangesForDay for why both the per-meal and overall ranges are checked together.
export function isDiningHallOpenNow(hall: DiningHall, date: Date = new Date()): boolean {
  const nowMinutes = date.getHours() * 60 + date.getMinutes()
  const today = allRangesForDay(hall, date)
  if (today.some((range) => nowMinutes >= range.start && nowMinutes < range.end)) return true

  // A range that runs past midnight (e.g. dinner 7pm–2am) is still "open" early the next morning.
  const yesterday = new Date(date)
  yesterday.setDate(date.getDate() - 1)
  const carriedOver = allRangesForDay(hall, yesterday)
  return carriedOver.some((range) => range.end > 24 * 60 && nowMinutes < range.end - 24 * 60)
}

export type NextOpen = { dayOffset: number; time: string }

// Looks forward up to a week for the next window that starts after "now" — dayOffset 0 means it
// opens later today, 1 means tomorrow, etc. Returns null if nothing parses within a week
// (shouldn't happen with real data, but every hall has at least one "Closed" day).
export function getNextDiningOpen(hall: DiningHall, date: Date = new Date()): NextOpen | null {
  const nowMinutes = date.getHours() * 60 + date.getMinutes()
  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const targetDate = new Date(date)
    targetDate.setDate(date.getDate() + dayOffset)
    const upcomingStarts = allRangesForDay(hall, targetDate)
      .map((range) => range.start)
      .filter((start) => dayOffset > 0 || start > nowMinutes)
      .sort((a, b) => a - b)
    if (upcomingStarts.length > 0) {
      return { dayOffset, time: formatMinutesSinceMidnight(upcomingStarts[0]) }
    }
  }
  return null
}

const DINING_BUILDING_TO_HALL: Record<string, DiningHall> = {
  'Bolton Dining Commons': 'bolton',
  'Oglethorpe Dining Commons': 'oglethorpe',
  'Snelling Dining Hall': 'snelling',
  'Hillside Dining Commons': 'hillside',
  'The Niche': 'niche',
  'Village Summit Dining Commons': 'villageSummit',
}

export function getDiningHallByBuildingName(buildingName: string): DiningHall | null {
  return DINING_BUILDING_TO_HALL[buildingName] ?? null
}

const DINING_HALL_TO_BUILDING: Record<DiningHall, string> = Object.fromEntries(
  Object.entries(DINING_BUILDING_TO_HALL).map(([buildingName, hall]) => [hall, buildingName]),
) as Record<DiningHall, string>

export function getDiningBuildingName(hall: DiningHall): string {
  return DINING_HALL_TO_BUILDING[hall]
}
