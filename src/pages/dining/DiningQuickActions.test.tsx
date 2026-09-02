import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as reactRouterDom from 'react-router-dom'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/renderWithProviders'
import { DiningQuickActions } from './DiningQuickActions'

const navigateSpy = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof reactRouterDom>()
  return { ...actual, useNavigate: () => navigateSpy }
})

beforeEach(() => {
  navigateSpy.mockClear()
})

describe('DiningQuickActions', () => {
  it('navigates to /map with a "focus" intent when See Location is clicked', async () => {
    renderWithProviders(<DiningQuickActions hall="bolton" />)

    await userEvent.click(screen.getByText('See Location'))

    expect(navigateSpy).toHaveBeenCalledTimes(1)
    const [path, options] = navigateSpy.mock.calls[0]
    expect(path).toBe('/map')
    expect(options.state.mapIntent).toMatchObject({ type: 'focus', label: 'Bolton Dining Commons' })
    expect(typeof options.state.mapIntent.lat).toBe('number')
    expect(typeof options.state.mapIntent.lng).toBe('number')
  })

  it('navigates to /map with a "directions" intent when Get Directions is clicked', async () => {
    renderWithProviders(<DiningQuickActions hall="oglethorpe" />)

    await userEvent.click(screen.getByText('Get Directions'))

    expect(navigateSpy).toHaveBeenCalledTimes(1)
    const [, options] = navigateSpy.mock.calls[0]
    expect(options.state.mapIntent).toMatchObject({ type: 'directions', label: 'Oglethorpe Dining Commons' })
  })
})
