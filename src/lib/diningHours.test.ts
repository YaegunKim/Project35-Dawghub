import { describe, expect, it } from 'vitest'
import {
  getDiningBuildingName,
  getDiningHallByBuildingName,
  getDiningHoursToday,
  getDiningMealHoursToday,
  getNextDiningOpen,
  isDiningHallOpenNow,
  splitHoursNote,
} from './diningHours'

function at(day: number, hour = 0, minute = 0): Date {
  // 2026-08-02 is a Sunday — day offsets from there land on the matching weekday.
  const date = new Date(2026, 7, 2 + day, hour, minute)
  return date
}

describe('getDiningHoursToday', () => {
  it('returns the hours string for the date\'s weekday', () => {
    expect(getDiningHoursToday('bolton', at(1))).toBe('7:00am–10:00pm')
    expect(getDiningHoursToday('bolton', at(0))).toBe('Closed')
  })
})

describe('splitHoursNote', () => {
  it('splits a trailing parenthetical into a separate note', () => {
    expect(splitHoursNote('5:00pm–7:00pm (HSC residents only)')).toEqual({
      hours: '5:00pm–7:00pm',
      note: 'HSC residents only',
    })
  })

  it('returns a null note when there is nothing to split', () => {
    expect(splitHoursNote('7:00am–3:00pm')).toEqual({ hours: '7:00am–3:00pm', note: null })
  })
})

describe('getDiningMealHoursToday', () => {
  it('returns the requested meal period for the date\'s weekday', () => {
    expect(getDiningMealHoursToday('bolton', 'lunch', at(1))).toBe('10:30am–4:00pm')
  })
})

describe('isDiningHallOpenNow', () => {
  it('is open during a normal daytime meal window', () => {
    expect(isDiningHallOpenNow('bolton', at(1, 12))).toBe(true)
  })

  it('is closed on a day the hall is fully closed', () => {
    expect(isDiningHallOpenNow('bolton', at(0, 12))).toBe(false)
  })

  it('treats a midday gap between meals as closed even within the overall day range', () => {
    // Niche: lunch ends 2:30pm, dinner starts 5pm — 3:30pm should read as closed.
    expect(isDiningHallOpenNow('niche', at(1, 15, 30))).toBe(false)
  })

  it('is open just after midnight for a window that runs past midnight the previous day', () => {
    // Hillside Monday: 7:00am–2:00am — 1am Tuesday is still "Monday's window" carried over.
    expect(isDiningHallOpenNow('hillside', at(2, 1))).toBe(true)
  })
})

describe('getNextDiningOpen', () => {
  it('finds a later opening the same day', () => {
    // Niche: lunch ends 2:30pm, dinner starts 5pm.
    const next = getNextDiningOpen('niche', at(1, 15))
    expect(next).toEqual({ dayOffset: 0, time: '5:00pm' })
  })

  it('rolls over to the next day when nothing is left open today', () => {
    // Bolton is fully closed on day 0 (Sunday) — next opening should be day 1 at 7am.
    const next = getNextDiningOpen('bolton', at(0, 12))
    expect(next).toEqual({ dayOffset: 1, time: '7:00am' })
  })
})

describe('building name <-> hall mapping', () => {
  it('round-trips a hall through its building name', () => {
    const buildingName = getDiningBuildingName('oglethorpe')
    expect(getDiningHallByBuildingName(buildingName)).toBe('oglethorpe')
  })

  it('returns null for an unknown building name', () => {
    expect(getDiningHallByBuildingName('Not A Real Building')).toBeNull()
  })
})
