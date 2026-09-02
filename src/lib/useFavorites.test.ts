import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useFavorites } from './useFavorites'

const KEY = 'test:favorites'

beforeEach(() => {
  localStorage.clear()
})

describe('useFavorites', () => {
  it('starts empty when nothing is stored', () => {
    const { result } = renderHook(() => useFavorites(KEY))
    expect(result.current.favorites).toEqual([])
    expect(result.current.isFavorite('bolton')).toBe(false)
  })

  it('reads a previously-persisted list on mount', () => {
    localStorage.setItem(KEY, JSON.stringify(['bolton']))
    const { result } = renderHook(() => useFavorites(KEY))
    expect(result.current.favorites).toEqual(['bolton'])
    expect(result.current.isFavorite('bolton')).toBe(true)
  })

  it('toggling adds then removes an id, and persists each change', () => {
    const { result } = renderHook(() => useFavorites(KEY))

    act(() => result.current.toggleFavorite('bolton'))
    expect(result.current.favorites).toEqual(['bolton'])
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(['bolton'])

    act(() => result.current.toggleFavorite('bolton'))
    expect(result.current.favorites).toEqual([])
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual([])
  })
})
