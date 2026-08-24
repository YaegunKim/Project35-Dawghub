import { useCallback, useEffect, useState } from 'react'

function readFavorites(storageKey: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function useFavorites(storageKey: string) {
  const [favorites, setFavorites] = useState<string[]>(() => readFavorites(storageKey))

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(favorites))
  }, [storageKey, favorites])

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites])

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }, [])

  return { favorites, isFavorite, toggleFavorite, setFavorites }
}
