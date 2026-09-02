import { expect, test } from '@playwright/test'
import { fireGpsFix, installFakeGeolocation } from './fixtures/geolocation'
import { mockGraphQL } from './fixtures/mockGraphQL'

test.beforeEach(async ({ page }) => {
  await installFakeGeolocation(page)
  // DiningHallCard's own menu fetch (getDiningMenu) is allow.authenticated() — Amplify
  // rejects it client-side before any request is made, since the E2E auth bypass skips
  // Cognito sign-in entirely (see App.tsx). That's fine here: See Location/Get Directions
  // don't depend on the menu ever loading, only on the hall's static building coordinates.
  await mockGraphQL(page, {})
})

test('See Location navigates to the map and zooms/ripples on the hall\'s building', async ({ page }) => {
  await page.goto('/dining')

  await page.getByText('See Location').first().click()

  await expect(page).toHaveURL('/map')
  await expect(page.locator('.dawghub-ripple')).toBeVisible()
})

test('Get Directions opens the trip planner and fills the origin once GPS resolves', async ({ page }) => {
  await page.goto('/dining')

  await page.getByText('Get Directions').first().click()
  await expect(page).toHaveURL('/map')

  const originInput = page.getByLabel('From', { exact: true })
  await expect(originInput).toBeVisible()
  await expect(originInput).toHaveValue('')

  await fireGpsFix(page, 33.9483, -83.3773)

  await expect(originInput).toHaveValue('My current location')
})
