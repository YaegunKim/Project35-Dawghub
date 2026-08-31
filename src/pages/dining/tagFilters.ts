import { useCallback, useEffect, useState } from 'react'

// Per-tag menu filter, layered on top of the plain dietary/allergen tags (see dietaryIcons.ts).
// 'show' is the implicit default and is never persisted — only 'hide' overrides are stored, so
// an empty object means "no filters active" (matches every other tag's default).
//
// There used to be a third 'only' state (AND-filter to items that have the tag), but it silently
// hid items that are safe just because the dining hall never bothered tagging them (e.g. "halal"
// only gets applied to meat dishes, so plain orange juice would vanish under "halal: only" even
// though nobody needs to avoid it) — misleadingly implying completeness the underlying data can't
// back up. Plain hide/show doesn't have that failure mode, since it only ever removes items that
// are positively tagged with something the user chose to avoid.
export type TagFilterState = 'show' | 'hide'

const TAG_FILTER_KEY = 'dawghub:dining:tagFilters'

function readTagFilters(): Record<string, 'hide'> {
  try {
    const raw = localStorage.getItem(TAG_FILTER_KEY)
    return raw ? (JSON.parse(raw) as Record<string, 'hide'>) : {}
  } catch {
    return {}
  }
}

export function useTagFilters() {
  const [filters, setFilters] = useState<Record<string, 'hide'>>(readTagFilters)

  useEffect(() => {
    localStorage.setItem(TAG_FILTER_KEY, JSON.stringify(filters))
  }, [filters])

  const getState = useCallback((tag: string): TagFilterState => filters[tag] ?? 'show', [filters])

  const setState = useCallback((tag: string, next: TagFilterState) => {
    setFilters((prev) => {
      if (next === 'show') {
        const { [tag]: _removed, ...rest } = prev
        return rest
      }
      return { ...prev, [tag]: next }
    })
  }, [])

  const reset = useCallback(() => setFilters({}), [])

  return { filters, getState, setState, reset }
}
