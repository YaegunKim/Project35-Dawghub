// Source: recsports.uga.edu Fall 2026 operating-hours flyers (PDF, hand-updated each
// semester — no public API). Transcribed manually; refresh at the start of each term.
// https://recsports.uga.edu/wp-content/uploads/sites/17/2026/07/RAMFALL26.pdf
// https://recsports.uga.edu/wp-content/uploads/sites/17/2026/07/HSCFALL26.pdf

type DateRange = { start: string; end: string; hours: string }

const RAMSEY_REGULAR: Record<number, string> = {
  0: '1pm–11pm',
  1: '6am–11pm',
  2: '6am–11pm',
  3: '6am–11pm',
  4: '6am–11pm',
  5: '6am–11pm',
  6: '9am–8pm',
}

const RAMSEY_EXCEPTIONS: DateRange[] = [
  { start: '2026-08-23', end: '2026-08-23', hours: '3pm–11pm' },
  { start: '2026-09-05', end: '2026-09-05', hours: 'Closed' },
  { start: '2026-09-07', end: '2026-09-07', hours: '9am–11pm' },
  { start: '2026-09-12', end: '2026-09-12', hours: 'Closed' },
  { start: '2026-09-26', end: '2026-09-26', hours: 'Closed' },
  { start: '2026-10-03', end: '2026-10-03', hours: 'Closed' },
  { start: '2026-10-17', end: '2026-10-17', hours: 'Closed' },
  { start: '2026-10-29', end: '2026-10-30', hours: '6am–9pm' },
  { start: '2026-10-31', end: '2026-10-31', hours: '9am–3pm' },
  { start: '2026-11-14', end: '2026-11-14', hours: 'Closed' },
  { start: '2026-11-20', end: '2026-11-20', hours: '6am–9pm' },
  { start: '2026-11-21', end: '2026-11-21', hours: '9am–6pm' },
  { start: '2026-11-22', end: '2026-11-22', hours: '1pm–7pm' },
  { start: '2026-11-23', end: '2026-11-24', hours: '6am–9pm' },
  { start: '2026-11-25', end: '2026-11-25', hours: '6am–5pm' },
  { start: '2026-11-26', end: '2026-11-28', hours: 'Closed' },
  { start: '2026-12-09', end: '2026-12-11', hours: '6am–9pm' },
  { start: '2026-12-12', end: '2026-12-12', hours: '9am–6pm' },
  { start: '2026-12-13', end: '2026-12-13', hours: '1pm–7pm' },
  { start: '2026-12-14', end: '2026-12-18', hours: '6am–9pm' },
  { start: '2026-12-19', end: '2026-12-19', hours: '9am–3pm' },
  { start: '2026-12-20', end: '2026-12-20', hours: '1pm–7pm' },
  { start: '2026-12-21', end: '2026-12-24', hours: '6am–5pm' },
  { start: '2026-12-25', end: '2026-12-31', hours: 'Closed' },
]

const POUND_WHEELER_REGULAR: Record<number, string> = {
  0: 'Closed',
  1: '11am–9pm',
  2: '11am–9pm',
  3: '11am–9pm',
  4: '11am–9pm',
  5: '11am–7pm',
  6: 'Closed',
}

const POUND_WHEELER_EXCEPTIONS: DateRange[] = [
  { start: '2026-09-07', end: '2026-09-07', hours: 'Closed' },
  { start: '2026-10-30', end: '2026-10-30', hours: 'Closed' },
  { start: '2026-11-23', end: '2026-11-27', hours: 'Closed' },
  { start: '2026-12-09', end: '2026-12-31', hours: 'Closed' },
]

export type GymFacility = 'ramsey' | 'poundWheeler'

const GYM_BUILDING_TO_FACILITY: Record<string, GymFacility> = {
  'Ramsey Center': 'ramsey',
  'Pound Hall': 'poundWheeler',
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function hoursFor(date: Date, regular: Record<number, string>, exceptions: DateRange[]): string {
  const iso = isoDate(date)
  const exception = exceptions.find((range) => iso >= range.start && iso <= range.end)
  return exception ? exception.hours : regular[date.getDay()]
}

export function getGymHoursToday(facility: GymFacility, date: Date = new Date()): string {
  return facility === 'ramsey'
    ? hoursFor(date, RAMSEY_REGULAR, RAMSEY_EXCEPTIONS)
    : hoursFor(date, POUND_WHEELER_REGULAR, POUND_WHEELER_EXCEPTIONS)
}

export function getGymHoursTodayByBuildingName(buildingName: string, date: Date = new Date()): string | null {
  const facility = GYM_BUILDING_TO_FACILITY[buildingName]
  return facility ? getGymHoursToday(facility, date) : null
}
