import { useCallback, useEffect, useState } from 'react'

// Per-tag menu filter, layered on top of the plain dietary/allergen tags (see dietaryIcons.ts).
// 'show' is the implicit default and is never persisted — only 'only'/'exclude' overrides are
// stored, so an empty object means "no filters active" (matches every other tag's default).
export type TagFilterState = 'show' | 'only' | 'exclude'

const TAG_FILTER_KEY = 'dawghub:dining:tagFilters'

function readTagFilters(): Record<string, 'only' | 'exclude'> {
  try {
    const raw = localStorage.getItem(TAG_FILTER_KEY)
    return raw ? (JSON.parse(raw) as Record<string, 'only' | 'exclude'>) : {}
  } catch {
    return {}
  }
}

export function useTagFilters() {
  const [filters, setFilters] = useState<Record<string, 'only' | 'exclude'>>(readTagFilters)

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
