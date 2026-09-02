import { describe, expect, it } from 'vitest'
import { category } from '../design-system/colors'
import { colorForCourse, formatHour, layoutDay, toMinutes } from './scheduleGrid'

describe('toMinutes', () => {
  it('converts an HH:MM string to minutes since midnight', () => {
    expect(toMinutes('00:00')).toBe(0)
    expect(toMinutes('09:30')).toBe(570)
    expect(toMinutes('23:59')).toBe(1439)
  })
})

describe('formatHour', () => {
  it('formats morning/noon/afternoon hours in 12-hour form', () => {
    expect(formatHour(0)).toBe('12a')
    expect(formatHour(9)).toBe('9a')
    expect(formatHour(12)).toBe('12p')
    expect(formatHour(15)).toBe('3p')
  })

  it('wraps hours past midnight (e.g. 25 -> 1am)', () => {
    expect(formatHour(25)).toBe('1a')
  })
})

describe('colorForCourse', () => {
  it('is deterministic for the same course code', () => {
    expect(colorForCourse('CSCI1301')).toBe(colorForCourse('CSCI1301'))
  })

  it('always returns one of the configured course colors', () => {
    expect(category.courses).toContain(colorForCourse('MATH2250'))
  })
})

describe('layoutDay', () => {
  it('gives every entry its own column when nothing overlaps', () => {
    const entries = [
      { startTime: '09:00', endTime: '10:00' },
      { startTime: '11:00', endTime: '12:00' },
    ]
    const laidOut = layoutDay(entries)
    expect(laidOut.map((e) => [e.column, e.columns])).toEqual([
      [0, 1],
      [0, 1],
    ])
  })

  it('splits two overlapping entries into 2 side-by-side columns', () => {
    const entries = [
      { startTime: '09:00', endTime: '10:30' },
      { startTime: '10:00', endTime: '11:00' },
    ]
    const laidOut = layoutDay(entries)
    expect(laidOut.every((e) => e.columns === 2)).toBe(true)
    expect(new Set(laidOut.map((e) => e.column))).toEqual(new Set([0, 1]))
  })

  it('starts a fresh (independent) cluster once the previous one has fully ended', () => {
    // A (9-10), B (9-10) overlap -> a 2-column cluster. C starts exactly when that
    // cluster ends, so it forms its own 1-column cluster rather than being forced wider.
    const entries = [
      { startTime: '09:00', endTime: '10:00' },
      { startTime: '09:00', endTime: '10:00' },
      { startTime: '10:00', endTime: '11:00' },
    ]
    const laidOut = layoutDay(entries)
    expect(laidOut.slice(0, 2).every((e) => e.columns === 2)).toBe(true)
    expect(laidOut[2]).toMatchObject({ column: 0, columns: 1 })
  })

  it('keeps non-overlapping clusters independent (a later cluster of 1 stays width 1)', () => {
    const entries = [
      { startTime: '09:00', endTime: '10:00' },
      { startTime: '09:30', endTime: '10:30' },
      { startTime: '14:00', endTime: '15:00' },
    ]
    const laidOut = layoutDay(entries)
    const morning = laidOut.filter((e) => e.startTime.startsWith('09'))
    const afternoon = laidOut.filter((e) => e.startTime.startsWith('14'))
    expect(morning.every((e) => e.columns === 2)).toBe(true)
    expect(afternoon[0].columns).toBe(1)
  })
})
