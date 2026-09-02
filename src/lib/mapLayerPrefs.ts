import { useCallback, useEffect, useState } from 'react'

// Client-side-only map layer display preferences (see ai/pages/Map/MapPage.md for why
// these live in localStorage instead of the Amplify-backed MapPreference model).

export const MAP_LIBRARY_FAVORITES_KEY = 'dawghub:map:library'
export const MAP_DINING_FAVORITES_KEY = 'dawghub:map:dining'
export const MAP_GYM_FAVORITES_KEY = 'dawghub:map:gym'

type BusLayerPrefs = {
  disabledRoutes: string[]
  panelOpen: boolean
  hideAll: boolean
  operatingOnly: boolean
}

const BUS_PREFS_KEY = 'dawghub:map:bus'
const DEFAULT_BUS_PREFS: BusLayerPrefs = {
  disabledRoutes: [],
  panelOpen: false,
  hideAll: false,
  operatingOnly: false,
}

function readBusPrefs(): BusLayerPrefs {
  try {
    const raw = localStorage.getItem(BUS_PREFS_KEY)
    if (!raw) return DEFAULT_BUS_PREFS
    const parsed = JSON.parse(raw) as Partial<BusLayerPrefs>
    return {
      disabledRoutes: Array.isArray(parsed.disabledRoutes) ? parsed.disabledRoutes : [],
      panelOpen: typeof parsed.panelOpen === 'boolean' ? parsed.panelOpen : false,
      hideAll: typeof parsed.hideAll === 'boolean' ? parsed.hideAll : false,
      operatingOnly: typeof parsed.operatingOnly === 'boolean' ? parsed.operatingOnly : false,
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

  const toggleRoute = useCallback((routeName: string) => {
    setPrefs((prev) => ({
      ...prev,
      disabledRoutes: prev.disabledRoutes.includes(routeName)
        ? prev.disabledRoutes.filter((route) => route !== routeName)
        : [...prev.disabledRoutes, routeName],
    }))
  }, [])

  const setPanelOpen = useCallback((panelOpen: boolean) => {
    setPrefs((prev) => ({ ...prev, panelOpen }))
  }, [])

  const setHideAll = useCallback((hideAll: boolean) => {
    setPrefs((prev) => ({ ...prev, hideAll }))
  }, [])

  const setOperatingOnly = useCallback((operatingOnly: boolean) => {
    setPrefs((prev) => ({ ...prev, operatingOnly }))
  }, [])

  const setDisabledRoutes = useCallback((disabledRoutes: string[]) => {
    setPrefs((prev) => ({ ...prev, disabledRoutes }))
  }, [])

  return {
    disabledRoutes: prefs.disabledRoutes,
    panelOpen: prefs.panelOpen,
    hideAll: prefs.hideAll,
    operatingOnly: prefs.operatingOnly,
    toggleRoute,
    setPanelOpen,
    setHideAll,
    setOperatingOnly,
    setDisabledRoutes,
  }
}
