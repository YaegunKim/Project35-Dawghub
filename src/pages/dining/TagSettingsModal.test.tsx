import { act, renderHook } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '../../test/renderWithProviders'
import { TagSettingsModal } from './TagSettingsModal'
import { useTagFilters } from './tagFilters'

const TAG_FILTER_KEY = 'dawghub:dining:tagFilters'

beforeEach(() => {
  // Reset the module-level filter store (not just localStorage) so state doesn't
  // leak between tests in this file.
  const { result } = renderHook(() => useTagFilters())
  act(() => result.current.reset())
})

function rowFor(label: string) {
  return within(screen.getByText(label).closest('div') as HTMLElement)
}

describe('TagSettingsModal', () => {
  it('hides a tag when its Hide segment is clicked, and shows a Reset button', async () => {
    renderWithProviders(<TagSettingsModal onClose={() => {}} />)

    expect(screen.queryByText('Reset')).not.toBeInTheDocument()

    await userEvent.click(rowFor('Vegan').getByRole('button', { name: 'Hide' }))

    expect(JSON.parse(localStorage.getItem(TAG_FILTER_KEY) ?? '{}')).toEqual({ vegan: 'hide' })
    expect(screen.getByText('Reset')).toBeInTheDocument()
  })

  it('cycling back to Show removes the tag from storage', async () => {
    renderWithProviders(<TagSettingsModal onClose={() => {}} />)

    await userEvent.click(rowFor('Vegan').getByRole('button', { name: 'Hide' }))
    await userEvent.click(rowFor('Vegan').getByRole('button', { name: 'Show' }))

    expect(JSON.parse(localStorage.getItem(TAG_FILTER_KEY) ?? '{}')).toEqual({})
    expect(screen.queryByText('Reset')).not.toBeInTheDocument()
  })

  it('Reset clears every active filter at once', async () => {
    renderWithProviders(<TagSettingsModal onClose={() => {}} />)

    await userEvent.click(rowFor('Vegan').getByRole('button', { name: 'Hide' }))
    await userEvent.click(rowFor('Peanuts').getByRole('button', { name: 'Hide' }))

    await userEvent.click(screen.getByText('Reset'))

    expect(JSON.parse(localStorage.getItem(TAG_FILTER_KEY) ?? '{}')).toEqual({})
    expect(screen.queryByText('Reset')).not.toBeInTheDocument()
  })
})
