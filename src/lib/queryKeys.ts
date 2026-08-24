// Shared TanStack Query keys for data fetched from more than one page,
// so navigating between pages (e.g. Schedule <-> Map) reuses the same cache entry.
export const CLASS_ENTRIES_KEY = ['classEntries'] as const
