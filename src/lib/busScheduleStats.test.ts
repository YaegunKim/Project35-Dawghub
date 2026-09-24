import { describe, expect, it } from 'vitest'
import { estimateBusLegDurationSeconds, estimateLiveWaitSeconds, estimateWaitSeconds, getServiceState, type RouteScheduleStats } from './busScheduleStats'
import { AVERAGE_BUS_SPEED_METERS_PER_SECOND, type PassioBus, type PassioRoute } from './passio'

// 2026-09-02T02:00:00.000Z is Wednesday 22:00 in America/New_York (UTC-4, EDT) — same reference
// point style busStats.test.ts uses, so a fixed instant always maps to a known Athens-local
// weekday/hour regardless of the machine running the test.
const WED_2200Z = '2026-09-02T02:00:00.000Z' // Athens: Tue 22:00 (weekday 2, minute 1320)
const WED_0600 = '2026-09-02T10:00:00.000Z' // Athens: Wed 06:00 (weekday 3, minute 360)
const WED_2330 = '2026-09-03T03:30:00.000Z' // Athens: Wed 23:30 (weekday 3, minute 1410)
const WED_1000 = '2026-09-02T14:00:00.000Z' // Athens: Wed 10:00 (weekday 3, hour 10, minute 600)

function emptyWeekday(): RouteScheduleStats['weekday'] {
  return Array.from({ length: 7 }, (_, day) => ({ weekday: day, firstDepartureMinute: null, lastArrivalMinute: null, cycleCount: 0 }))
}

describe('getServiceState', () => {
  it('reports live whenever a live bus is tracked, regardless of stats', () => {
    expect(getServiceState(null, true, WED_1000).kind).toBe('live')
  })

  it('reports noData when there is no stats row for the route at all', () => {
    expect(getServiceState(null, false, WED_1000).kind).toBe('noData')
  })

  it('reports noData when the weekday has too few cycles to be confident', () => {
    const weekday = emptyWeekday()
    weekday[3] = { weekday: 3, firstDepartureMinute: 420, lastArrivalMinute: 1380, cycleCount: 1 } // below MIN_CYCLES_FOR_WINDOW
    const stats: RouteScheduleStats = { routeName: 'Milledge', weekday, hour: [] }
    expect(getServiceState(stats, false, WED_0600).kind).toBe('noData')
  })

  it('reports beforeFirstBus when now is earlier than the usual first departure', () => {
    const weekday = emptyWeekday()
    weekday[3] = { weekday: 3, firstDepartureMinute: 420, lastArrivalMinute: 1380, cycleCount: 10 } // Wed, 7:00am-11:00pm
    const stats: RouteScheduleStats = { routeName: 'Milledge', weekday, hour: [] }
    const state = getServiceState(stats, false, WED_0600) // Wed 06:00 < 7:00am
    expect(state).toMatchObject({ kind: 'beforeFirstBus', expectedMinute: 420 })
  })

  it('reports afterLastBus and finds the next weekday with a confident window', () => {
    const weekday = emptyWeekday()
    weekday[3] = { weekday: 3, firstDepartureMinute: 420, lastArrivalMinute: 1380, cycleCount: 10 } // Wed window already over
    weekday[4] = { weekday: 4, firstDepartureMinute: 415, lastArrivalMinute: 1390, cycleCount: 8 } // Thu
    const stats: RouteScheduleStats = { routeName: 'Milledge', weekday, hour: [] }
    const state = getServiceState(stats, false, WED_2330) // Wed 23:30 > 11:00pm
    expect(state).toMatchObject({ kind: 'afterLastBus', expectedMinute: 415, expectedWeekday: 4 })
  })

  it('reports afterLastBus with no expected time when no later weekday has enough data', () => {
    const weekday = emptyWeekday()
    weekday[3] = { weekday: 3, firstDepartureMinute: 420, lastArrivalMinute: 1380, cycleCount: 10 }
    const stats: RouteScheduleStats = { routeName: 'Milledge', weekday, hour: [] }
    const state = getServiceState(stats, false, WED_2330)
    expect(state).toMatchObject({ kind: 'afterLastBus', expectedMinute: null })
  })

  it('reports gap with the hour bucket headway when inside the window but no live bus', () => {
    const weekday = emptyWeekday()
    weekday[3] = { weekday: 3, firstDepartureMinute: 420, lastArrivalMinute: 1380, cycleCount: 10 }
    const stats: RouteScheduleStats = {
      routeName: 'Milledge',
      weekday,
      hour: [{ hour: 10, medianHeadwayMinutes: 12, segments: [] }],
    }
    const state = getServiceState(stats, false, WED_1000) // Wed 10:00, inside 7am-11pm window
    expect(state).toMatchObject({ kind: 'gap', medianHeadwayMinutes: 12 })
  })

  it('ignores the viewer-local calendar day and uses Athens time', () => {
    // WED_2200Z is Tuesday 22:00 in Athens even though the UTC calendar date is Wednesday.
    const weekday = emptyWeekday()
    weekday[2] = { weekday: 2, firstDepartureMinute: 420, lastArrivalMinute: 1380, cycleCount: 10 } // Tuesday
    const stats: RouteScheduleStats = { routeName: 'Milledge', weekday, hour: [] }
    const state = getServiceState(stats, false, WED_2200Z) // Tue 22:00 > 11:00pm? no, 1320 < 1380
    expect(state.kind).not.toBe('noData')
  })
})

describe('estimateBusLegDurationSeconds', () => {
  const routeStops = [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }]
  const stats: RouteScheduleStats = {
    routeName: 'Milledge',
    weekday: emptyWeekday(),
    hour: [
      {
        hour: 10,
        medianHeadwayMinutes: null,
        segments: [
          { fromStopId: 'A', fromStopName: 'A', toStopId: 'B', toStopName: 'B', medianDurationSeconds: 120, sampleCount: 5 },
          { fromStopId: 'B', fromStopName: 'B', toStopId: 'C', toStopName: 'C', medianDurationSeconds: 90, sampleCount: 5 },
        ],
      },
    ],
  }

  it('sums real historical segment durations when every segment is covered', () => {
    const seconds = estimateBusLegDurationSeconds(stats, routeStops, 'A', 'C', WED_1000, 900)
    expect(seconds).toBe(210)
  })

  it('blends the flat fallback, prorated, for segments with no historical sample', () => {
    const fallbackDistanceMeters = 900
    const seconds = estimateBusLegDurationSeconds(stats, routeStops, 'A', 'D', WED_1000, fallbackDistanceMeters)
    // A->B and B->C are real (210s total), C->D falls back — prorated as 1 of 3 segments.
    const fallbackTotal = fallbackDistanceMeters / AVERAGE_BUS_SPEED_METERS_PER_SECOND
    expect(seconds).toBeCloseTo(210 + fallbackTotal / 3, 5)
  })

  it('falls back entirely when there are no stats at all', () => {
    const fallbackDistanceMeters = 550
    const seconds = estimateBusLegDurationSeconds(null, routeStops, 'A', 'C', WED_1000, fallbackDistanceMeters)
    expect(seconds).toBeCloseTo(fallbackDistanceMeters / AVERAGE_BUS_SPEED_METERS_PER_SECOND, 5)
  })

  it('wraps past the end of the loop back to index 0, same as a real route', () => {
    const loopStats: RouteScheduleStats = {
      routeName: 'Milledge',
      weekday: emptyWeekday(),
      hour: [
        {
          hour: 10,
          medianHeadwayMinutes: null,
          segments: [{ fromStopId: 'C', fromStopName: 'C', toStopId: 'A', toStopName: 'A', medianDurationSeconds: 75, sampleCount: 5 }],
        },
      ],
    }
    const seconds = estimateBusLegDurationSeconds(loopStats, routeStops.slice(0, 3), 'C', 'A', WED_1000, 400)
    expect(seconds).toBe(75)
  })
})

describe('estimateLiveWaitSeconds', () => {
  // Nine points, evenly spaced 0.25° of longitude apart along the equator (lat 0, so degrees
  // of longitude convert to meters with no latitude distortion) — two 4-sub-segment legs,
  // A(idx0)->B(idx4)->C(idx8), giving locateBusOnRoute exact grid points to snap to instead of
  // only the stops themselves.
  const points: [number, number][] = Array.from({ length: 9 }, (_, i) => [0, i * 0.25])
  const route: PassioRoute = {
    id: 'route-1',
    name: 'ROUTE',
    color: '#000',
    code: 'R',
    segments: [points],
    stops: [
      { id: 'A', name: 'A', latitude: 0, longitude: 0, polylineIndex: 0 },
      { id: 'B', name: 'B', latitude: 0, longitude: 1, polylineIndex: 4 },
      { id: 'C', name: 'C', latitude: 0, longitude: 2, polylineIndex: 8 },
    ],
  }
  const stats: RouteScheduleStats = {
    routeName: 'ROUTE',
    weekday: emptyWeekday(),
    hour: [
      {
        hour: 10,
        medianHeadwayMinutes: null,
        segments: [
          { fromStopId: 'A', fromStopName: 'A', toStopId: 'B', toStopName: 'B', medianDurationSeconds: 100, sampleCount: 5 },
          { fromStopId: 'B', fromStopName: 'B', toStopId: 'C', toStopName: 'C', medianDurationSeconds: 200, sampleCount: 5 },
          { fromStopId: 'C', fromStopName: 'C', toStopId: 'A', toStopName: 'A', medianDurationSeconds: 300, sampleCount: 5 },
        ],
      },
    ],
  }
  function busAt(longitude: number): PassioBus {
    return { id: 'bus-1', route: 'ROUTE', color: '#000', latitude: 0, longitude, course: 0 }
  }

  it("scales the current leg's historical duration by how much of it the bus has already covered", () => {
    // Bus sits exactly halfway between A and B — half of A->B's historical 100s should remain.
    const seconds = estimateLiveWaitSeconds(route, [busAt(0.5)], { id: 'B' }, stats, WED_1000)
    expect(seconds).toBeCloseTo(50, 0)
  })

  it("adds every full leg after the bus's current one when the boarding stop is further along", () => {
    // Bus is 3/4 through B->C (200s historical => 50s left), then a full C->A leg (300s) to
    // finish the lap and reach A.
    const seconds = estimateLiveWaitSeconds(route, [busAt(1.75)], { id: 'A' }, stats, WED_1000)
    expect(seconds).toBeCloseTo(350, 0)
  })

  it('returns null when no live bus is on this route', () => {
    const unrelatedBus: PassioBus = { id: 'bus-2', route: 'OTHER', color: '#000', latitude: 0, longitude: 0.5, course: 0 }
    expect(estimateLiveWaitSeconds(route, [unrelatedBus], { id: 'B' }, stats, WED_1000)).toBeNull()
  })

  it('picks the soonest of several live buses on the same route', () => {
    const nearBus = busAt(0.75) // 3/4 through A->B — little left
    const farBus = busAt(0.25) // 1/4 through A->B — most of the leg still ahead
    const seconds = estimateLiveWaitSeconds(route, [farBus, nearBus], { id: 'B' }, stats, WED_1000)
    expect(seconds).toBeCloseTo(25, 0) // 100 * (1 - 3/4)
  })
})

describe('estimateWaitSeconds', () => {
  it('estimates half the median headway for that hour', () => {
    const stats: RouteScheduleStats = {
      routeName: 'Milledge',
      weekday: emptyWeekday(),
      hour: [{ hour: 10, medianHeadwayMinutes: 12, segments: [] }],
    }
    expect(estimateWaitSeconds(stats, WED_1000, 300)).toBe(360) // 12*60/2
  })

  it('never goes below a 1-minute floor even for a very tight headway', () => {
    const stats: RouteScheduleStats = {
      routeName: 'Milledge',
      weekday: emptyWeekday(),
      hour: [{ hour: 10, medianHeadwayMinutes: 1, segments: [] }],
    }
    expect(estimateWaitSeconds(stats, WED_1000, 300)).toBe(60)
  })

  it('falls back to the given constant when that hour has no headway data', () => {
    expect(estimateWaitSeconds(null, WED_1000, 300)).toBe(300)
    const stats: RouteScheduleStats = { routeName: 'Milledge', weekday: emptyWeekday(), hour: [] }
    expect(estimateWaitSeconds(stats, WED_1000, 300)).toBe(300)
  })
})
