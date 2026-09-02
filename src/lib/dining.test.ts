import { describe, expect, it } from 'vitest'
import {
  filterItemsByTagState,
  getCurrentMealType,
  groupMenuItemsBySection,
  sortHallsByFavorite,
  sortSectionsByItemCount,
  sortSectionsByPinned,
} from './dining'

type Item = { name: string; section: string; dietary: string[]; allergens: string[] }

function item(name: string, section: string, dietary: string[] = [], allergens: string[] = []): Item {
  return { name, section, dietary, allergens }
}

describe('getCurrentMealType', () => {
  it('buckets the hour into breakfast/lunch/dinner', () => {
    expect(getCurrentMealType(new Date(2026, 0, 1, 8))).toBe('breakfast')
    expect(getCurrentMealType(new Date(2026, 0, 1, 12))).toBe('lunch')
    expect(getCurrentMealType(new Date(2026, 0, 1, 18))).toBe('dinner')
  })
})

describe('filterItemsByTagState', () => {
  const items = [
    item('Peanut cookie', 'Dessert', [], ['peanuts']),
    item('Garden salad', 'Sides', ['vegan']),
    item('Grilled chicken', 'Entrees'),
  ]

  it('returns items unchanged when nothing is hidden', () => {
    expect(filterItemsByTagState(items, {})).toEqual(items)
  })

  it('drops any item carrying a hidden tag (dietary or allergen)', () => {
    const result = filterItemsByTagState(items, { peanuts: 'hide' })
    expect(result.map((i) => i.name)).toEqual(['Garden salad', 'Grilled chicken'])
  })

  it('ORs multiple hidden tags — an item matching any one of them is dropped', () => {
    const result = filterItemsByTagState(items, { peanuts: 'hide', vegan: 'hide' })
    expect(result.map((i) => i.name)).toEqual(['Grilled chicken'])
  })

  it('never removes an item just for lacking a tag (no AND/only semantics)', () => {
    // "Grilled chicken" has no dietary tags at all — hiding "vegan" must not require it.
    const result = filterItemsByTagState(items, { vegan: 'hide' })
    expect(result.map((i) => i.name)).toContain('Grilled chicken')
  })
})

describe('groupMenuItemsBySection', () => {
  it('groups items by section, preserving first-seen order', () => {
    const items = [item('A', 'Entrees'), item('B', 'Sides'), item('C', 'Entrees')]
    const groups = groupMenuItemsBySection(items, 'Other')
    expect(groups.map(([section]) => section)).toEqual(['Entrees', 'Sides'])
    expect(groups.find(([section]) => section === 'Entrees')?.[1].map((i) => i.name)).toEqual(['A', 'C'])
  })

  it('falls back to the "other" label for items with no section', () => {
    const groups = groupMenuItemsBySection([item('A', '')], 'Other')
    expect(groups[0][0]).toBe('Other')
  })
})

describe('sortSectionsByPinned', () => {
  it('floats pinned sections to the top without reordering within each group', () => {
    const sections: [string, number[]][] = [['A', [1]], ['B', [2]], ['C', [3]]]
    const sorted = sortSectionsByPinned(sections, ['C'])
    expect(sorted.map(([name]) => name)).toEqual(['C', 'A', 'B'])
  })
})

describe('sortSectionsByItemCount', () => {
  it('sorts sections by item count, largest first', () => {
    const sections: [string, number[]][] = [['A', [1]], ['B', [1, 2, 3]], ['C', [1, 2]]]
    const sorted = sortSectionsByItemCount(sections)
    expect(sorted.map(([name]) => name)).toEqual(['B', 'C', 'A'])
  })
})

describe('sortHallsByFavorite', () => {
  it('floats favorited halls to the top without changing relative order otherwise', () => {
    const halls = ['bolton', 'hillside', 'oglethorpe'] as const
    const sorted = sortHallsByFavorite([...halls], ['oglethorpe'])
    expect(sorted).toEqual(['oglethorpe', 'bolton', 'hillside'])
  })
})
