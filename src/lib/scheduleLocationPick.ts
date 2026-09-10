import type { Day } from './scheduleGrid'
import { fetchUgaBuildings, findBuildingByName } from './ugaBuildings'
import type { MapNavigationIntent } from './mapNavigation'

// The in-progress add-class form's fields — carried as the `draft` payload of a
// MapPickIntent (see mapNavigation.ts) across the round trip to /map for location
// picking, since the modal (and its field state) unmounts on navigation.
export type ScheduleDraft = {
  courseCode: string
  title: string
  day: Day
  startTime: string
  endTime: string
  location: string
  locationLat: number | null
  locationLng: number | null
}

// Resolves a class entry's location to map coordinates for the "Get Directions" action, the
// same way buildDiningMapIntent (dining.ts) does for dining halls. Prefers the exact pin from
// "Set location" (locationLat/locationLng) when present, and falls back to matching the
// free-text location against the UGA building list otherwise — most classes only have the
// latter, since course-search import (SchedulePage's createClassEntries) never captures
// coordinates, only "building + room" text.
export async function buildClassMapIntent(
  entry: { location?: string | null; locationLat?: number | null; locationLng?: number | null },
  type: MapNavigationIntent['type'],
): Promise<MapNavigationIntent | null> {
  if (entry.locationLat != null && entry.locationLng != null) {
    return { type, lat: entry.locationLat, lng: entry.locationLng, label: entry.location ?? '' }
  }
  if (!entry.location) return null
  const buildings = await fetchUgaBuildings()
  const building = findBuildingByName(buildings, entry.location)
  if (!building) return null
  return { type, lat: building.latitude, lng: building.longitude, label: building.name }
}
