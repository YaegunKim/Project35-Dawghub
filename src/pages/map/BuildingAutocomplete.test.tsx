import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/renderWithProviders'
import { BuildingAutocomplete } from './BuildingAutocomplete'

const BUILDING_NAMES = ['Boyd Research and Education Center', 'Boyd Golf Center', 'Tate Student Center', 'Main Library']

// BuildingAutocomplete is a controlled component (value comes back in via props, same as
// MapPage's real usage) — the harness needs its own state so typing actually round-trips,
// otherwise the input would never visibly change no matter what the user types.
function Harness({ onChangeSpy }: { onChangeSpy?: (value: string) => void }) {
  const [value, setValue] = useState('')
  return (
    <BuildingAutocomplete
      value={value}
      onChange={(next) => {
        setValue(next)
        onChangeSpy?.(next)
      }}
      buildingNames={BUILDING_NAMES}
      placeholder="Starting point"
      ariaLabel="From"
    />
  )
}

describe('BuildingAutocomplete', () => {
  it('shows matching suggestions once the input has text', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness />)

    await user.click(screen.getByRole('combobox', { name: 'From' }))
    await user.type(screen.getByRole('combobox', { name: 'From' }), 'boyd')

    await waitFor(() => {
      expect(screen.getByText('Boyd Research and Education Center')).toBeInTheDocument()
      expect(screen.getByText('Boyd Golf Center')).toBeInTheDocument()
    })
    expect(screen.queryByText('Tate Student Center')).not.toBeInTheDocument()
  })

  it('calls onChange with the full name when a suggestion is clicked', async () => {
    const user = userEvent.setup()
    const onChangeSpy = vi.fn()
    renderWithProviders(<Harness onChangeSpy={onChangeSpy} />)

    await user.type(screen.getByRole('combobox', { name: 'From' }), 'tate')
    await waitFor(() => expect(screen.getByText('Tate Student Center')).toBeInTheDocument())
    await user.click(screen.getByText('Tate Student Center'))

    expect(onChangeSpy).toHaveBeenLastCalledWith('Tate Student Center')
  })

  it('shows nothing when there is no text or no match', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness />)

    await user.click(screen.getByRole('combobox', { name: 'From' }))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    await user.type(screen.getByRole('combobox', { name: 'From' }), 'zzz-no-match')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
