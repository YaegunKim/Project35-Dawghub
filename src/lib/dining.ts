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
