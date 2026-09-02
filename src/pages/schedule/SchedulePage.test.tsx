import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/renderWithProviders'
import { SchedulePage } from './SchedulePage'
import type { Schema } from '../../../amplify/data/resource'

type ClassEntry = Schema['ClassEntry']['type']

// ClassEntry/Friendship are allow.owner()/allow.authenticated() models — real Amplify calls
// need a signed-in Cognito session to even attempt the request (Playwright's network-boundary
// mocking can't help here, since Amplify's client rejects before any fetch happens without one).
// Mocking the client module directly sidesteps that entirely, which is the standard way to
// component-test Amplify-backed pages.
vi.mock('../../lib/amplifyClient', () => ({
  client: {
    models: {
      ClassEntry: {
        list: vi.fn(async () => ({ data: mockEntries })),
        create: vi.fn(),
        delete: vi.fn(),
      },
      Friendship: { list: vi.fn(async () => ({ data: [] })) },
    },
  },
}))

vi.mock('aws-amplify/auth', () => ({
  fetchUserAttributes: vi.fn(async () => ({ email: '' })),
  getCurrentUser: vi.fn(async () => ({ userId: 'u1', username: 'u1' })),
}))

let mockEntries: ClassEntry[] = []

function entry(overrides: Partial<ClassEntry>): ClassEntry {
  return {
    id: 'e1',
    courseCode: 'CSCI4300',
    title: null,
    day: 'MON',
    startTime: '09:00',
    endTime: '10:00',
    location: null,
    locationLat: null,
    locationLng: null,
    ...overrides,
  } as ClassEntry
}

describe('SchedulePage grid layout', () => {
  it('renders a class block positioned at its start time (PX_PER_HOUR=56, default start hour=5)', async () => {
    mockEntries = [entry({})]
    renderWithProviders(<SchedulePage />)

    const label = await screen.findByText('CSCI4300')
    const block = label.parentElement as HTMLElement

    // 9:00 is 4 hours after the grid's 5am start -> 4 * 56 = 224px. The class is 1 hour -> 56px tall.
    const computed = getComputedStyle(block)
    expect(computed.top).toBe('224px')
    expect(computed.height).toBe('56px')
  })

  it('gives two overlapping classes half-width side-by-side columns', async () => {
    mockEntries = [
      entry({ id: 'a', courseCode: 'CSCI4300', startTime: '09:00', endTime: '10:30' }),
      entry({ id: 'b', courseCode: 'MATH2250', startTime: '09:30', endTime: '10:30' }),
    ]
    renderWithProviders(<SchedulePage />)

    const blockA = (await screen.findByText('CSCI4300')).parentElement as HTMLElement
    const blockB = (await screen.findByText('MATH2250')).parentElement as HTMLElement

    const widthA = getComputedStyle(blockA).width
    const widthB = getComputedStyle(blockB).width
    expect(widthA).toBe('calc(50% - 4px)')
    expect(widthB).toBe('calc(50% - 4px)')
    expect(getComputedStyle(blockA).left).not.toBe(getComputedStyle(blockB).left)
  })
})
