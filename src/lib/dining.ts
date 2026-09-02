import { getDiningBuildingName, type DiningHall, type NextOpen } from './diningHours'
import { fetchUgaBuildings, findBuildingByName } from './ugaBuildings'
import type { MapNavigationIntent } from './mapNavigation'

export type MealType = 'breakfast' | 'lunch' | 'dinner'

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner']

// Default display order when no favorites are set.
export const DINING_HALLS: DiningHall[] = ['bolton', 'hillside', 'oglethorpe', 'snelling', 'niche', 'villageSummit']

export function getCurrentMealType(date: Date = new Date()): MealType {
  const hour = date.getHours()
  if (hour < 10) return 'breakfast'
  if (hour < 15) return 'lunch'
  return 'dinner'
}

export function sortHallsByFavorite(halls: DiningHall[], favorites: string[]): DiningHall[] {
  return [...halls].sort((a, b) => {
    const aFav = favorites.includes(a)
    const bFav = favorites.includes(b)
    if (aFav === bFav) return 0
    return aFav ? -1 : 1
  })
}

export function groupMenuItemsBySection<T extends { section: string }>(
  items: T[],
  otherLabel: string,
): [string, T[]][] {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const key = item.section || otherLabel
    const group = groups.get(key)
    if (group) group.push(item)
    else groups.set(key, [item])
  }
  return Array.from(groups.entries())
}

// Pinned sections float to the top; a section name is pinned globally (not per hall/meal), so
// e.g. always pinning "Entrees" keeps it first everywhere that section name shows up — including
// the home tab's per-hall card preview (DiningHallCard), not just the detail page.
export const PINNED_SECTIONS_KEY = 'dawghub:dining:pinnedSections'

export function sortSectionsByPinned<T>(sections: [string, T][], pinned: string[]): [string, T][] {
  return [...sections].sort((a, b) => {
    const aPinned = pinned.includes(a[0])
    const bPinned = pinned.includes(b[0])
    if (aPinned === bPinned) return 0
    return aPinned ? -1 : 1
  })
}

// Sorts sections by item count, most first — apply this BEFORE sortSectionsByPinned so a pin
// still wins overall (Array.prototype.sort is stable, so ties within "pinned"/"not pinned" keep
// this count-based order).
export function sortSectionsByItemCount<T>(sections: [string, T[]][]): [string, T[]][] {
  return [...sections].sort((a, b) => b[1].length - a[1].length)
}

// Hidden tags are OR'd — having any one of them drops the item. (An earlier version also had an
// "only" AND-filter, but it hid items that are safe just because the dining hall never bothered
// tagging them — e.g. plain orange juice under "halal: only" — which misleadingly implied more
// completeness than the underlying tagging data actually has. Plain hide doesn't have that
// problem: it only ever removes items positively tagged with something the user chose to avoid.)
export function filterItemsByTagState<T extends { dietary: string[]; allergens: string[] }>(
  items: T[],
  filters: Record<string, 'hide'>,
): T[] {
  const hiddenTags = Object.keys(filters)
  if (hiddenTags.length === 0) return items

  return items.filter((item) => {
    const itemTags = [...item.dietary, ...item.allergens]
    return !hiddenTags.some((tag) => itemTags.includes(tag))
  })
}

export const WEEKDAY_I18N_KEYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

// Reuses the weekday names already translated for the Schedule page (schedule.days.*) instead of
// introducing a second set of day-name strings just for this.
export function formatNextOpenLabel(t: (key: string, options?: Record<string, unknown>) => string, next: NextOpen) {
  if (next.dayOffset === 0) return t('dining.opensToday', { time: next.time })
  if (next.dayOffset === 1) return t('dining.opensTomorrow', { time: next.time })

  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + next.dayOffset)
  const day = t(`schedule.days.${WEEKDAY_I18N_KEYS[targetDate.getDay()]}`)
  return t('dining.opensOnDay', { day, time: next.time })
}

// Shown under the Dining tab title — "September 1 · Tuesday" / "9월 1일 화요일". The month/day
// portion is locale-formatted via Intl so it reads naturally in either language, while the
// weekday reuses the same schedule.days.* translations as formatNextOpenLabel above.
export function formatTodayLabel(t: (key: string, options?: Record<string, unknown>) => string, language: string) {
  const now = new Date()
  const locale = language.startsWith('ko') ? 'ko-KR' : 'en-US'
  const date = new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric' }).format(now)
  const day = t(`schedule.days.${WEEKDAY_I18N_KEYS[now.getDay()]}`)
  return t('dining.todayDate', { date, day })
}

// Resolves a hall's building coordinates for the "See Location"/"Get Directions" card and
// detail-page buttons — buildings are the static local dataset (see ugaBuildings.ts), so this
// resolves instantly without hitting a network endpoint.
export async function buildDiningMapIntent(
  hall: DiningHall,
  type: MapNavigationIntent['type'],
): Promise<MapNavigationIntent | null> {
  const buildingName = getDiningBuildingName(hall)
  const buildings = await fetchUgaBuildings()
  const building = findBuildingByName(buildings, buildingName)
  if (!building) return null
  return { type, lat: building.latitude, lng: building.longitude, label: building.name }
}
