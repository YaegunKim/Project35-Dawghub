import { describe, expect, it } from 'vitest'
import {
  getCurrentFootballSeasonYear,
  isFootballGameDay,
  pickRelevantGame,
  type FootballGame,
} from './footballSchedule'

function game(overrides: Partial<FootballGame>): FootballGame {
  return {
    gameId: '1',
    opponent: 'Opponent',
    isHome: true,
    startTimeEpochMs: 0,
    gameState: 'pre',
    period: '',
    clock: '',
    teamScore: null,
    opponentScore: null,
    ...overrides,
  }
}

const DAY_MS = 24 * 60 * 60 * 1000
// Constructed from local Y/M/D components (not a UTC ISO string) so "same calendar day"
// comparisons below aren't at the mercy of the test runner's timezone offset.
const NOW = new Date(2026, 8, 15, 12, 0, 0).getTime()

describe('getCurrentFootballSeasonYear', () => {
  it('uses the calendar year for any month except January', () => {
    expect(getCurrentFootballSeasonYear(new Date('2026-09-15T00:00:00Z').getTime())).toBe(2026)
    expect(getCurrentFootballSeasonYear(new Date('2026-12-31T00:00:00Z').getTime())).toBe(2026)
  })

  it('attributes January to the previous year\'s season (bowls/CFP)', () => {
    expect(getCurrentFootballSeasonYear(new Date('2027-01-10T00:00:00Z').getTime())).toBe(2026)
  })
})

describe('pickRelevantGame', () => {
  it('prefers a live game over an upcoming one', () => {
    const live = game({ gameId: 'live', gameState: 'live', startTimeEpochMs: NOW - 1000 })
    const upcoming = game({ gameId: 'upcoming', gameState: 'pre', startTimeEpochMs: NOW + DAY_MS })
    expect(pickRelevantGame([upcoming, live], NOW)?.gameId).toBe('live')
  })

  it('picks the soonest upcoming game when nothing is live', () => {
    const soon = game({ gameId: 'soon', gameState: 'pre', startTimeEpochMs: NOW + DAY_MS })
    const later = game({ gameId: 'later', gameState: 'pre', startTimeEpochMs: NOW + DAY_MS * 7 })
    expect(pickRelevantGame([later, soon], NOW)?.gameId).toBe('soon')
  })

  it('ignores final games and games already in the past', () => {
    const finished = game({ gameId: 'finished', gameState: 'final', startTimeEpochMs: NOW - DAY_MS })
    expect(pickRelevantGame([finished], NOW)).toBeNull()
  })

  it('returns null when there is no live or upcoming game', () => {
    expect(pickRelevantGame([], NOW)).toBeNull()
  })
})

describe('isFootballGameDay', () => {
  it('is true when a game is live regardless of its scheduled date', () => {
    const live = game({ gameState: 'live', startTimeEpochMs: NOW - DAY_MS * 3 })
    expect(isFootballGameDay([live], NOW)).toBe(true)
  })

  it('is true when a game is scheduled for the same calendar day', () => {
    const today = game({ gameState: 'pre', startTimeEpochMs: NOW + 60 * 60 * 1000 })
    expect(isFootballGameDay([today], NOW)).toBe(true)
  })

  it('is false when the only games are on other days', () => {
    const nextWeek = game({ gameState: 'pre', startTimeEpochMs: NOW + DAY_MS * 7 })
    expect(isFootballGameDay([nextWeek], NOW)).toBe(false)
  })

  it('is false with no games at all', () => {
    expect(isFootballGameDay([], NOW)).toBe(false)
  })
})
