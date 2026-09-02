import type { Day } from './scheduleGrid'

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
