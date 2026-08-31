import type { DiningHall } from './diningHours'

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

// "only" tags are AND'd (an item must have every "only" tag to survive), "exclude" tags are
// OR'd (having any one of them drops the item) — the two combine, so e.g. "vegan: only" +
// "peanuts: exclude" together means "vegan items that don't contain peanuts".
export function filterItemsByTagState<T extends { dietary: string[]; allergens: string[] }>(
  items: T[],
  filters: Record<string, 'only' | 'exclude'>,
): T[] {
  const onlyTags = Object.entries(filters)
    .filter(([, state]) => state === 'only')
    .map(([tag]) => tag)
  const excludeTags = Object.entries(filters)
    .filter(([, state]) => state === 'exclude')
    .map(([tag]) => tag)

  if (onlyTags.length === 0 && excludeTags.length === 0) return items

  return items.filter((item) => {
    const itemTags = [...item.dietary, ...item.allergens]
    const matchesAllOnly = onlyTags.every((tag) => itemTags.includes(tag))
    const matchesAnyExclude = excludeTags.some((tag) => itemTags.includes(tag))
    return matchesAllOnly && !matchesAnyExclude
  })
}
