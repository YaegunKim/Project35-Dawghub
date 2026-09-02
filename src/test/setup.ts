import '@testing-library/jest-dom/vitest'
import '../i18n'

// jsdom doesn't implement matchMedia — ThemeContext/GlobalStyles read it to detect the
// OS light/dark preference.
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

// jsdom doesn't implement ResizeObserver — used by some Leaflet-adjacent layout code.
if (!window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
