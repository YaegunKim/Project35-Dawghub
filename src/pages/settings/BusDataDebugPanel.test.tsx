import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'
import { BusDataDebugPanel } from './BusDataDebugPanel'

// 2026-08-31T15:00:00Z is Monday 11:00am in America/New_York.
const MON_11AM = '2026-08-31T15:00:00.000Z'
const MON_1105AM = '2026-08-31T15:05:00.000Z'

function arrival(overrides: { busId: string; stopId: string; stopName: string; arrivedAt: string }) {
  return { id: `${overrides.busId}-${overrides.stopId}-${overrides.arrivedAt}`, routeName: 'TestRoute', ...overrides }
}

const ROWS = [
  arrival({ busId: 'bus-1', stopId: 'A', stopName: 'Stop A', arrivedAt: MON_11AM }),
  arrival({ busId: 'bus-1', stopId: 'B', stopName: 'Stop B', arrivedAt: MON_1105AM }),
  arrival({ busId: 'bus-2', stopId: 'A', stopName: 'Stop A', arrivedAt: MON_11AM }),
  arrival({ busId: 'bus-2', stopId: 'B', stopName: 'Stop B', arrivedAt: MON_1105AM }),
  arrival({ busId: 'bus-3', stopId: 'A', stopName: 'Stop A', arrivedAt: MON_11AM }),
  arrival({ busId: 'bus-3', stopId: 'B', stopName: 'Stop B', arrivedAt: MON_1105AM }),
]

vi.mock('../../lib/amplifyClient', () => ({
  client: {
    models: {
      BusStopArrival: {
        list: vi.fn(async () => ({ data: ROWS, nextToken: null })),
      },
    },
  },
}))

vi.mock('../../lib/passio', () => ({
  fetchUgaRoutesAndStops: vi.fn(async () => ({
    routes: [
      {
        id: 'r1',
        name: 'TestRoute',
        color: '#000',
        code: 'T',
        segments: [],
        stops: [
          { id: 'A', name: 'Stop A', latitude: 0, longitude: 0, polylineIndex: 0 },
          { id: 'B', name: 'Stop B', latitude: 0, longitude: 0, polylineIndex: 1 },
        ],
      },
    ],
    stops: [],
  })),
  getBusRouteCode: () => 'T',
}))

describe('BusDataDebugPanel', () => {
  it('shows the weekday arrival grid and segment duration derived from raw rows', async () => {
    renderWithProviders(<BusDataDebugPanel />)

    await userEvent.click(screen.getByRole('button', { name: 'Bus data collection' }))

    // "Stop A"/"Stop B" each appear twice now: once in the weekday grid, once in the
    // per-cycle grid below it.
    expect(await screen.findAllByText('Stop A')).toHaveLength(2)
    expect(screen.getAllByText('Stop B')).toHaveLength(2)

    // Monday column should show the median arrival time for Stop A (11:00am) — the exact
    // median/cycle-time computation itself is covered by busStats.test.ts; here we only check
    // it made it into the DOM at all. It shows up several times (weekday grid + per-cycle grid).
    expect(screen.getAllByText('11:00am').length).toBeGreaterThan(0)

    // Segment A -> B: 5 minutes, 3 samples.
    expect(screen.getByText('Stop A → Stop B')).toBeInTheDocument()
    expect(screen.getByText('~5 min (3)')).toBeInTheDocument()

    // All 3 buses complete an A -> B lap on the same Athens-local date.
    expect(screen.getByText('3 cycles across 3 buses on 2026-08-31')).toBeInTheDocument()
  })
})
