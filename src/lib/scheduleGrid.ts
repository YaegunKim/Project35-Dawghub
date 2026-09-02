// Pure, presentation-agnostic helpers for laying out a weekly class schedule grid.
// Shared between SchedulePage (own schedule, editable) and FriendSchedulePage
// (a friend's schedule, read-only) — kept generic over entry shape so both
// ClassEntry (Schema['ClassEntry']['type']) and FriendClassEntry (the
// getFriendSchedule Lambda's return type) satisfy it structurally.

import { category } from '../design-system/colors'

export const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const
export type Day = (typeof DAYS)[number]

export const PX_PER_HOUR = 56
export const DEFAULT_START_HOUR = 5
export const DEFAULT_END_HOUR = 24

const COURSE_COLORS = category.courses

export function toMinutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function colorForCourse(code: string) {
  let hash = 0
  for (let i = 0; i < code.length; i++) hash = (hash * 31 + code.charCodeAt(i)) >>> 0
  return COURSE_COLORS[hash % COURSE_COLORS.length]
}

export function formatHour(hour: number) {
  const normalized = ((hour % 24) + 24) % 24
  const h12 = normalized % 12 === 0 ? 12 : normalized % 12
  const suffix = normalized < 12 ? 'a' : 'p'
  return `${h12}${suffix}`
}

type TimedEntry = { startTime: string; endTime: string }
export type LaidOutEntry<T> = T & { column: number; columns: number }

export function layoutDay<T extends TimedEntry>(dayEntries: T[]): LaidOutEntry<T>[] {
  const sorted = [...dayEntries].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))
  const clusters: T[][] = []
  let current: T[] = []
  let currentEnd = -1

  for (const entry of sorted) {
    if (current.length === 0 || toMinutes(entry.startTime) < currentEnd) {
      current.push(entry)
      currentEnd = Math.max(currentEnd, toMinutes(entry.endTime))
    } else {
      clusters.push(current)
      current = [entry]
      currentEnd = toMinutes(entry.endTime)
    }
  }
  if (current.length) clusters.push(current)

  const result: LaidOutEntry<T>[] = []
  for (const cluster of clusters) {
    const columnEnds: number[] = []
    for (const entry of cluster) {
      const start = toMinutes(entry.startTime)
      let column = columnEnds.findIndex((end) => end <= start)
      if (column === -1) {
        column = columnEnds.length
        columnEnds.push(toMinutes(entry.endTime))
      } else {
        columnEnds[column] = toMinutes(entry.endTime)
      }
      result.push({ ...entry, column, columns: 0 })
    }
    const columns = columnEnds.length
    for (const entry of result.slice(-cluster.length)) entry.columns = columns
  }
  return result
}
