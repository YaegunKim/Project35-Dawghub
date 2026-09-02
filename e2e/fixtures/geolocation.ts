import type { Page } from '@playwright/test'

// Chromium's built-in geolocation mock errors immediately if no position was set before the
// first watchPosition call, which makes `context.setGeolocation()` useless for testing "GPS
// resolves after a delay" (e.g. the origin-auto-fill race in MapPage). This fully replaces
// navigator.geolocation with a fake that only reports a position/error when the test tells it
// to, via window.__fireGpsFix/__fireGpsError.
export async function installFakeGeolocation(page: Page) {
  await page.addInitScript(() => {
    type SuccessCb = (position: GeolocationPosition) => void
    type ErrorCb = (error: GeolocationPositionError) => void
    let successCb: SuccessCb | null = null
    let errorCb: ErrorCb | null = null

    Object.defineProperty(window.navigator, 'geolocation', {
      configurable: true,
      value: {
        watchPosition(success: SuccessCb, error?: ErrorCb) {
          successCb = success
          errorCb = error ?? null
          return 1
        },
        clearWatch() {
          successCb = null
          errorCb = null
        },
        getCurrentPosition(success: SuccessCb) {
          successCb = success
        },
      },
    })

    Object.assign(window, {
      __fireGpsFix(lat: number, lng: number, accuracy = 10) {
        successCb?.({
          coords: { latitude: lat, longitude: lng, accuracy, heading: null } as GeolocationCoordinates,
          timestamp: Date.now(),
        } as GeolocationPosition)
      },
      __fireGpsError() {
        errorCb?.({ code: 2, message: 'position unavailable' } as GeolocationPositionError)
      },
    })
  })
}

export async function fireGpsFix(page: Page, lat: number, lng: number) {
  await page.evaluate(([lat_, lng_]) => (window as any).__fireGpsFix(lat_, lng_), [lat, lng])
}
