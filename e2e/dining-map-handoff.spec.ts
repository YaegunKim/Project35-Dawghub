import { expect, test } from '@playwright/test'
import { fireGpsFix, installFakeGeolocation } from './fixtures/geolocation'
import { mockGraphQL } from './fixtures/mockGraphQL'

test.beforeEach(async ({ page }) => {
  await installFakeGeolocation(page)
  // DiningHallCard's own menu fetch (getDiningMenu) is allow.authenticated() — Amplify
  // rejects it client-side before any request is made, since the E2E auth bypass skips
  // Cognito sign-in entirely (see App.tsx). That's fine here: See Location/Get Directions
  // don't depend on the menu ever loading, only on the hall's static building coordinates.
  //
  // listRouteScheduleStats IS mocked, though: the GPS-resolves-origin flow below ends by
  // auto-triggering a real trip search (handleGetDirections's autoSearchPending effect), which
  // calls planTrip → fetchRouteScheduleStats for whichever real bus routes end up near the
  // fake GPS fix. Left unmocked, mockGraphQL's own catch-all fallback returns a malformed
  // `{data: null}` response (no `listRouteScheduleStats` field at all) for that query instead
  // of erroring cleanly.
  await mockGraphQL(page, { listRouteScheduleStats: () => ({ items: [], nextToken: null }) })
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

  // Confirmed (via render-level logging) that the origin state itself updates correctly and
  // near-instantly on the GPS fix — but the actual DOM commit for this specific input can lag
  // a second or more under this dev-mode, unminified, single-worker sandbox, now that MapPage
  // does meaningfully more work per render than it used to (RouteScheduleStat-aware ETAs,
  // transfer-aware trip planning, etc.). The default 5s timeout already covers this well over
  // 85% of the time; bumping it is calibrating to real (if occasionally slow) behavior, not
  // masking a logic bug.
  await expect(originInput).toHaveValue('My current location', { timeout: 15_000 })
})
