import { describe, expect, it } from 'vitest'
import {
  computeSegmentStats,
  computeStopWeekdayStats,
  distinctAthensDates,
  formatMinuteOfDay,
  reconstructCycles,
  type ArrivalRow,
} from './busStats'

const STOPS = [
  { id: 'A', name: 'Stop A' },
  { id: 'B', name: 'Stop B' },
  { id: 'C', name: 'Stop C' },
]

function row(overrides: Partial<ArrivalRow>): ArrivalRow {
  return { busId: 'bus-1', routeName: 'Milledge', stopId: 'A', stopName: 'Stop A', arrivedAt: '2026-09-01T12:00:00.000Z', ...overrides }
}

describe('formatMinuteOfDay', () => {
  it('formats minutes since midnight in 12-hour form', () => {
    expect(formatMinuteOfDay(0)).toBe('12:00am')
    expect(formatMinuteOfDay(9 * 60 + 5)).toBe('9:05am')
    expect(formatMinuteOfDay(13 * 60 + 30)).toBe('1:30pm')
  })
})

describe('computeStopWeekdayStats', () => {
  it('buckets an arrival into its Athens-local weekday, not the UTC weekday', () => {
    // 2026-09-02T02:00:00Z is Wednesday in UTC but still Tuesday 10pm in America/New_York
    // (UTC-4, EDT) — a naive UTC-day read would misfile this into the wrong weekday bucket.
    const rows = [row({ stopId: 'A', arrivedAt: '2026-09-02T02:00:00.000Z' })]
    // Need >= MIN_SAMPLES(3) for a median to show — pad with the same value.
    const padded = [...rows, ...rows, ...rows]
    const stats = computeStopWeekdayStats(padded, STOPS)

    const stopA = stats.find((s) => s.stopId === 'A')!
    expect(stopA.sampleCountByDay[2]).toBe(3) // Tuesday
    expect(stopA.sampleCountByDay[3]).toBe(0) // Wednesday — must be empty
    expect(stopA.medianMinuteByDay[2]).toBe(22 * 60) // 10:00pm Athens time
  })

  it('requires at least 3 samples before reporting a median', () => {
    const rows = [row({}), row({})] // only 2 samples, same day/stop
    const stats = computeStopWeekdayStats(rows, STOPS)
    const stopA = stats.find((s) => s.stopId === 'A')!
    // whichever day these 2 samples land in, it should still be null (below threshold)
    expect(stopA.medianMinuteByDay.every((m) => m === null)).toBe(true)
  })

  it('returns one entry per stop in the given order, even with no data at all', () => {
    const stats = computeStopWeekdayStats([], STOPS)
    expect(stats.map((s) => s.stopId)).toEqual(['A', 'B', 'C'])
    expect(stats.every((s) => s.medianMinuteByDay.every((m) => m === null))).toBe(true)
  })
})

describe('computeSegmentStats', () => {
  it('records a segment for two adjacent stops visited in order within a plausible gap', () => {
    const rows: ArrivalRow[] = [
      row({ busId: 'bus-1', stopId: 'A', arrivedAt: '2026-09-01T12:00:00.000Z' }),
      row({ busId: 'bus-1', stopId: 'B', arrivedAt: '2026-09-01T12:05:00.000Z' }),
      row({ busId: 'bus-2', stopId: 'A', arrivedAt: '2026-09-01T13:00:00.000Z' }),
      row({ busId: 'bus-2', stopId: 'B', arrivedAt: '2026-09-01T13:04:00.000Z' }),
      row({ busId: 'bus-3', stopId: 'A', arrivedAt: '2026-09-01T14:00:00.000Z' }),
      row({ busId: 'bus-3', stopId: 'B', arrivedAt: '2026-09-01T14:06:00.000Z' }),
    ]
    const segments = computeSegmentStats(rows, STOPS)
    const aToB = segments.find((s) => s.fromStopId === 'A' && s.toStopId === 'B')!
    expect(aToB.sampleCount).toBe(3)
    expect(aToB.medianDurationSeconds).toBe(5 * 60) // median of 5, 4, 6 minutes
  })

  it('does not fabricate a segment when a stop in between was skipped (order violation)', () => {
    // Same busId jumps straight from A to C, skipping B — must not be recorded as any segment.
    const rows: ArrivalRow[] = [
      row({ busId: 'bus-1', stopId: 'A', arrivedAt: '2026-09-01T12:00:00.000Z' }),
      row({ busId: 'bus-1', stopId: 'C', arrivedAt: '2026-09-01T12:05:00.000Z' }),
    ]
    const segments = computeSegmentStats(rows, STOPS)
    expect(segments.every((s) => s.sampleCount === 0)).toBe(true)
  })

  it('ignores a gap that is implausibly long between adjacent stops', () => {
    const rows: ArrivalRow[] = [
      row({ busId: 'bus-1', stopId: 'A', arrivedAt: '2026-09-01T12:00:00.000Z' }),
      row({ busId: 'bus-1', stopId: 'B', arrivedAt: '2026-09-01T13:00:00.000Z' }), // 60 min later
    ]
    const segments = computeSegmentStats(rows, STOPS)
    const aToB = segments.find((s) => s.fromStopId === 'A' && s.toStopId === 'B')!
    expect(aToB.sampleCount).toBe(0)
  })

  it('is not confused by the same busId being reused on a later, unrelated route', () => {
    // Real-world bug this guards against: Passio reuses busId across routes. Rows for this
    // busId that belong to a *different* route are simply never passed in here (the caller
    // filters by routeName first) — simulate that by including a row whose stop id isn't
    // part of this route's stopOrder at all, which must be silently ignored, not crash or
    // pollute a segment.
    const rows: ArrivalRow[] = [
      row({ busId: 'bus-1', stopId: 'A', arrivedAt: '2026-09-01T12:00:00.000Z' }),
      row({ busId: 'bus-1', stopId: 'not-on-this-route', arrivedAt: '2026-09-01T12:03:00.000Z' }),
      row({ busId: 'bus-1', stopId: 'B', arrivedAt: '2026-09-01T12:20:00.000Z' }),
    ]
    const segments = computeSegmentStats(rows, STOPS)
    const aToB = segments.find((s) => s.fromStopId === 'A' && s.toStopId === 'B')!
    expect(aToB.sampleCount).toBe(0)
  })

  it('returns segments for every adjacent stop pair in order, even with zero data', () => {
    const segments = computeSegmentStats([], STOPS)
    expect(segments.map((s) => [s.fromStopId, s.toStopId])).toEqual([
      ['A', 'B'],
      ['B', 'C'],
    ])
  })
})

describe('reconstructCycles', () => {
  // 2026-09-01T12:00:00Z is 8:00am Athens time, still 2026-09-01 locally.
  it('reconstructs one lap from a forward pass through the stops', () => {
    const rows: ArrivalRow[] = [
      row({ busId: 'bus-1', stopId: 'A', arrivedAt: '2026-09-01T12:00:00.000Z' }),
      row({ busId: 'bus-1', stopId: 'B', arrivedAt: '2026-09-01T12:05:00.000Z' }),
      row({ busId: 'bus-1', stopId: 'C', arrivedAt: '2026-09-01T12:09:00.000Z' }),
    ]
    const cycles = reconstructCycles(rows, STOPS)
    expect(cycles).toHaveLength(1)
    expect(cycles[0]).toMatchObject({ busId: 'bus-1', date: '2026-09-01', stopMinutes: [8 * 60, 8 * 60 + 5, 8 * 60 + 9] })
  })

  it('starts a new cycle once the loop wraps back to an earlier stop', () => {
    const rows: ArrivalRow[] = [
      row({ busId: 'bus-1', stopId: 'A', arrivedAt: '2026-09-01T12:00:00.000Z' }),
      row({ busId: 'bus-1', stopId: 'B', arrivedAt: '2026-09-01T12:05:00.000Z' }),
      row({ busId: 'bus-1', stopId: 'C', arrivedAt: '2026-09-01T12:09:00.000Z' }),
      // Wraps back to A — a second lap, not a continuation of the first.
      row({ busId: 'bus-1', stopId: 'A', arrivedAt: '2026-09-01T12:30:00.000Z' }),
      row({ busId: 'bus-1', stopId: 'B', arrivedAt: '2026-09-01T12:35:00.000Z' }),
    ]
    const cycles = reconstructCycles(rows, STOPS)
    expect(cycles).toHaveLength(2)
    expect(cycles[0].stopMinutes).toEqual([8 * 60, 8 * 60 + 5, 8 * 60 + 9])
    expect(cycles[1].stopMinutes).toEqual([8 * 60 + 30, 8 * 60 + 35, null])
  })

  it('tolerates a skipped stop within one lap instead of splitting it', () => {
    const rows: ArrivalRow[] = [
      row({ busId: 'bus-1', stopId: 'A', arrivedAt: '2026-09-01T12:00:00.000Z' }),
      row({ busId: 'bus-1', stopId: 'C', arrivedAt: '2026-09-01T12:09:00.000Z' }), // B missed by the poll
    ]
    const cycles = reconstructCycles(rows, STOPS)
    expect(cycles).toHaveLength(1)
    expect(cycles[0].stopMinutes).toEqual([8 * 60, null, 8 * 60 + 9])
  })

  it('splits into a new cycle when the gap between stops is implausibly long', () => {
    const rows: ArrivalRow[] = [
      row({ busId: 'bus-1', stopId: 'A', arrivedAt: '2026-09-01T12:00:00.000Z' }),
      row({ busId: 'bus-1', stopId: 'B', arrivedAt: '2026-09-01T14:00:00.000Z' }), // 2 hours later
    ]
    const cycles = reconstructCycles(rows, STOPS)
    // Each single-stop fragment is below MIN_STOPS_PER_CYCLE, so neither survives.
    expect(cycles).toHaveLength(0)
  })

  it('collapses repeated pings at the same stop into a single arrival, keeping the first time', () => {
    const rows: ArrivalRow[] = [
      row({ busId: 'bus-1', stopId: 'A', arrivedAt: '2026-09-01T12:00:00.000Z' }),
      row({ busId: 'bus-1', stopId: 'A', arrivedAt: '2026-09-01T12:01:00.000Z' }), // still dwelling
      row({ busId: 'bus-1', stopId: 'B', arrivedAt: '2026-09-01T12:05:00.000Z' }),
    ]
    const cycles = reconstructCycles(rows, STOPS)
    expect(cycles).toHaveLength(1)
    expect(cycles[0].stopMinutes).toEqual([8 * 60, 8 * 60 + 5, null])
  })

  it('drops fragments with fewer than 2 recorded stops', () => {
    const rows: ArrivalRow[] = [row({ busId: 'bus-1', stopId: 'A', arrivedAt: '2026-09-01T12:00:00.000Z' })]
    expect(reconstructCycles(rows, STOPS)).toHaveLength(0)
  })
})

describe('distinctAthensDates', () => {
  it('returns deduplicated Athens-local dates, most recent first', () => {
    const rows: ArrivalRow[] = [
      row({ arrivedAt: '2026-09-01T12:00:00.000Z' }),
      row({ arrivedAt: '2026-09-01T13:00:00.000Z' }),
      row({ arrivedAt: '2026-09-02T12:00:00.000Z' }),
    ]
    expect(distinctAthensDates(rows)).toEqual(['2026-09-02', '2026-09-01'])
  })
})
