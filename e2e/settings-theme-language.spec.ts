import { expect, test } from '@playwright/test'
import { mockGraphQL } from './fixtures/mockGraphQL'

test.beforeEach(async ({ page }) => {
  // SettingsPage's debug panel only queries when expanded, but Amplify still needs the
  // GraphQL boundary mocked in case anything else on the page fires a request.
  await mockGraphQL(page, {})
})

test('dark theme persists across reload', async ({ page }) => {
  await page.goto('/settings')
  await expect(page.locator('html')).not.toHaveAttribute('data-theme')

  await page.getByText('Dark', { exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('switching language updates on-screen text', async ({ page }) => {
  await page.goto('/settings')
  await expect(page.getByText('Preferences', { exact: true })).toBeVisible()

  await page.getByText('한국어', { exact: true }).click()

  await expect(page.getByText('환경설정', { exact: true })).toBeVisible()
})
