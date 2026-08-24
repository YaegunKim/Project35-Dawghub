import { useCallback, useEffect, useState } from 'react'

// Client-side-only map layer display preferences (see ai/pages/Map/MapPage.md for why
// these live in localStorage instead of the Amplify-backed MapPreference model).

export const MAP_LIBRARY_FAVORITES_KEY = 'dawghub:map:library'
export const MAP_DINING_FAVORITES_KEY = 'dawghub:map:dining'
export const MAP_GYM_FAVORITES_KEY = 'dawghub:map:gym'

export type BusMode = 'running' | 'all' | 'custom'

type BusLayerPrefs = {
  mode: BusMode
  selectedRoutes: string[]
}

const BUS_PREFS_KEY = 'dawghub:map:bus'
const DEFAULT_BUS_PREFS: BusLayerPrefs = { mode: 'all', selectedRoutes: [] }

function readBusPrefs(): BusLayerPrefs {
  try {
    const raw = localStorage.getItem(BUS_PREFS_KEY)
    if (!raw) return DEFAULT_BUS_PREFS
    const parsed = JSON.parse(raw) as Partial<BusLayerPrefs>
    return {
      mode: parsed.mode === 'running' || parsed.mode === 'custom' ? parsed.mode : 'all',
      selectedRoutes: Array.isArray(parsed.selectedRoutes) ? parsed.selectedRoutes : [],
    }
  } catch {
    return DEFAULT_BUS_PREFS
  }
}

export function useBusLayerPrefs() {
  const [prefs, setPrefs] = useState<BusLayerPrefs>(readBusPrefs)

  useEffect(() => {
    localStorage.setItem(BUS_PREFS_KEY, JSON.stringify(prefs))
  }, [prefs])

  const setMode = useCallback((mode: BusMode) => {
    setPrefs((prev) => ({ ...prev, mode }))
  }, [])

  const toggleRoute = useCallback((routeName: string) => {
    setPrefs((prev) => ({
      ...prev,
      selectedRoutes: prev.selectedRoutes.includes(routeName)
        ? prev.selectedRoutes.filter((route) => route !== routeName)
        : [...prev.selectedRoutes, routeName],
    }))
  }, [])

  return { mode: prefs.mode, selectedRoutes: prefs.selectedRoutes, setMode, toggleRoute }
}
