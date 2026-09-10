import { describe, expect, it } from 'vitest'
import { currentAcademicTerm, upcomingMilestones } from './academicCalendar'

describe('currentAcademicTerm', () => {
  it('resolves a date in the fall window to the Fall 2026 term', () => {
    expect(currentAcademicTerm(new Date(2026, 8, 10))?.term).toBe('FALL')
  })

  it('resolves a date in the spring window to the Spring 2027 term', () => {
    expect(currentAcademicTerm(new Date(2027, 1, 1))?.term).toBe('SPRING')
  })

  it('returns undefined for a date outside every declared term (summer, or a term nobody added yet)', () => {
    expect(currentAcademicTerm(new Date(2026, 6, 1))).toBeUndefined()
    expect(currentAcademicTerm(new Date(2028, 0, 1))).toBeUndefined()
  })
})

describe('upcomingMilestones', () => {
  it('only returns milestones on or after `now`, within the current term', () => {
    // 2026-09-10: Labor Day (Sept 7) has already passed, Fall Break (Oct 30) hasn't.
    const milestones = upcomingMilestones(new Date(2026, 8, 10))
    expect(milestones.map((m) => m.labelKey)).not.toContain('laborDay')
    expect(milestones[0]?.labelKey).toBe('fallBreak')
  })

  it('returns an empty list outside any declared term, so the UI can hide the strip entirely', () => {
    expect(upcomingMilestones(new Date(2026, 6, 1))).toEqual([])
  })

  it('respects the requested count', () => {
    const milestones = upcomingMilestones(new Date(2026, 7, 17), 3)
    expect(milestones).toHaveLength(3)
  })
})
