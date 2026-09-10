import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as reactRouterDom from 'react-router-dom'
import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '../../test/renderWithProviders'
import { SchedulePage } from './SchedulePage'
import type { Schema } from '../../../amplify/data/resource'

type ClassEntry = Schema['ClassEntry']['type']

const navigateSpy = vi.fn()

// Mirrors DiningQuickActions.test.tsx's pattern — keeps useLocation (used by the pick-
// location-on-map return flow) real, only swaps useNavigate for a spy so "Get Directions"
// can be asserted without a /map route actually being mounted in this test.
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof reactRouterDom>()
  return { ...actual, useNavigate: () => navigateSpy }
})

let deleteImpl: () => Promise<{ errors?: unknown[] }>

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
        create: vi.fn(async (vars) => ({ data: { id: `restored-${Math.random()}`, ...vars } })),
        delete: vi.fn(() => deleteImpl()),
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

describe('SchedulePage delete + undo', () => {
  beforeEach(() => {
    deleteImpl = async () => ({})
    navigateSpy.mockClear()
  })

  it('removes the class immediately and offers an undo toast', async () => {
    mockEntries = [entry({})]
    renderWithProviders(<SchedulePage />)

    await userEvent.click(await screen.findByText('CSCI4300'))
    await userEvent.click(await screen.findByRole('button', { name: 'Remove class' }))

    expect(screen.queryByText('CSCI4300')).not.toBeInTheDocument()
    expect(await screen.findByText('Removed CSCI4300.')).toBeInTheDocument()
  })

  it('restores the class when Undo is clicked', async () => {
    mockEntries = [entry({})]
    renderWithProviders(<SchedulePage />)

    await userEvent.click(await screen.findByText('CSCI4300'))
    await userEvent.click(await screen.findByRole('button', { name: 'Remove class' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }))

    expect(await screen.findByText('CSCI4300')).toBeInTheDocument()
  })

  it('rolls back and shows an error toast if the delete request fails', async () => {
    deleteImpl = async () => ({ errors: [{ message: 'boom' }] })
    mockEntries = [entry({})]
    renderWithProviders(<SchedulePage />)

    await userEvent.click(await screen.findByText('CSCI4300'))
    await userEvent.click(await screen.findByRole('button', { name: 'Remove class' }))

    expect(await screen.findByText("Couldn't remove the class — try again.")).toBeInTheDocument()
    expect(await screen.findByText('CSCI4300')).toBeInTheDocument()
  })
})

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

describe('SchedulePage meeting detail — "See different time" + Get Directions', () => {
  beforeEach(() => {
    navigateSpy.mockClear()
  })

  it('shows only the tapped day up front, behind a "See different time" toggle for the rest', async () => {
    mockEntries = [
      entry({ id: 'e1', day: 'MON', location: 'Conner Hall 0104' }),
      entry({ id: 'e2', day: 'WED', startTime: '13:00', endTime: '14:00', location: 'Journalism Building' }),
    ]
    renderWithProviders(<SchedulePage />)

    const monBlock = (await screen.findAllByText('CSCI4300'))[0]
    await userEvent.click(monBlock)
    const detailBody = (await screen.findByRole('button', { name: 'Remove class' })).closest('div') as HTMLElement

    // MON (the tapped block) is shown up front, in full.
    expect(within(detailBody).getByText('Conner Hall 0104')).toBeInTheDocument()
    expect(within(detailBody).getByRole('button', { name: 'Directions' })).toBeInTheDocument()
    // WED isn't listed until the toggle is opened.
    expect(within(detailBody).queryByText('Journalism Building')).not.toBeInTheDocument()
    expect(within(detailBody).getAllByRole('button', { name: 'Directions' })).toHaveLength(1)

    await userEvent.click(within(detailBody).getByText('See different time'))

    expect(within(detailBody).getByText('Journalism Building')).toBeInTheDocument()
    // Both days' details (and Directions buttons) are visible at once once opened.
    expect(within(detailBody).getByText('Conner Hall 0104')).toBeInTheDocument()
    expect(within(detailBody).getAllByRole('button', { name: 'Directions' })).toHaveLength(2)
  })

  it('does not show the "See different time" toggle for a course that only meets once', async () => {
    mockEntries = [entry({ location: 'Conner Hall 0104' })]
    renderWithProviders(<SchedulePage />)

    await userEvent.click(await screen.findByText('CSCI4300'))

    expect(screen.queryByText('See different time')).not.toBeInTheDocument()
  })

  it('navigates to /map with a directions intent when Get Directions is clicked', async () => {
    mockEntries = [entry({ location: 'Conner Hall 0104' })]
    renderWithProviders(<SchedulePage />)

    await userEvent.click(await screen.findByText('CSCI4300'))
    await userEvent.click(await screen.findByRole('button', { name: 'Directions' }))

    expect(navigateSpy).toHaveBeenCalledTimes(1)
    const [path, options] = navigateSpy.mock.calls[0]
    expect(path).toBe('/map')
    expect(options.state.mapIntent).toMatchObject({ type: 'directions', label: 'Conner Hall' })
  })

  it('does not show a Directions button for a meeting with no location', async () => {
    mockEntries = [entry({ location: null })]
    renderWithProviders(<SchedulePage />)

    await userEvent.click(await screen.findByText('CSCI4300'))

    expect(screen.queryByRole('button', { name: 'Directions' })).not.toBeInTheDocument()
  })
})
