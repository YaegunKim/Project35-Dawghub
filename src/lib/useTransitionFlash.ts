import { useEffect, useRef, useState } from 'react'

// Briefly returns true right after `value` changes (skipping the very first render), then flips
// back to false after `durationMs`. Filtering/sorting here is synchronous, so the list would
// otherwise jump-cut to its new contents instantly — flashing the existing loading skeleton for
// a beat makes the change read as a deliberate transition instead of an abrupt swap.
export function useTransitionFlash<T>(value: T, durationMs: number): boolean {
  const [flashing, setFlashing] = useState(false)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setFlashing(true)
    const timeout = setTimeout(() => setFlashing(false), durationMs)
    return () => clearTimeout(timeout)
  }, [value, durationMs])

  return flashing
}
