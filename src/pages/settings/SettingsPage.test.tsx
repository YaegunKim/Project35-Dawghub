import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import i18n from '../../i18n'
import { ThemeProvider } from '../../app/ThemeContext'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/renderWithProviders'
import { SettingsPage } from './SettingsPage'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

afterEach(async () => {
  await i18n.changeLanguage('en')
})

function renderSettings() {
  return renderWithProviders(
    <ThemeProvider>
      <SettingsPage userEmail="dawg@uga.edu" onSignOut={() => {}} />
    </ThemeProvider>,
  )
}

describe('SettingsPage theme', () => {
  it('defaults to system (no data-theme attribute) with nothing stored', () => {
    renderSettings()
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })

  it('sets data-theme and persists to localStorage when Dark is picked', async () => {
    renderSettings()
    await userEvent.click(screen.getByText('Dark'))

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem('dawghub:theme')).toBe('dark')
  })

  it('clears the override and localStorage when switching back to System', async () => {
    renderSettings()
    await userEvent.click(screen.getByText('Light'))
    await userEvent.click(screen.getByText('System'))

    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
    expect(localStorage.getItem('dawghub:theme')).toBeNull()
  })
})

describe('SettingsPage language', () => {
  it('switches i18n language and persists it', async () => {
    renderSettings()
    await userEvent.click(screen.getByText('한국어'))

    expect(i18n.language).toBe('ko')
    expect(localStorage.getItem('i18nextLng')).toBe('ko')
  })
})
