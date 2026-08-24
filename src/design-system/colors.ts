// Static brand colors (do not change with light/dark theme).
export const brand = {
  primary: '#BA0C2F',
  primaryDark: '#8C0924',
  primaryLight: '#E63A5A',
  black: '#171008',
  white: '#FFFFFF',
} as const

// Theme-aware surface colors — these are just the CSS custom properties
// defined in GlobalStyles.tsx, re-exported so components can `import { surface }`
// instead of typing `var(--...)` strings by hand. Light/dark switching still
// happens in GlobalStyles' `prefers-color-scheme` block, not here.
export const surface = {
  bg: 'var(--bg)',
  bgElevated: 'var(--bg-elevated)',
  text: 'var(--text)',
  textMuted: 'var(--text-muted)',
  border: 'var(--border)',
  accent: 'var(--accent)',
  accentContrast: 'var(--accent-contrast)',
} as const

// UI state colors that aren't tied to light/dark theme (e.g. destructive actions).
export const state = {
  danger: '#ef4444',
  dangerSoft: 'rgba(239, 68, 68, 0.08)',
} as const

// Semantic category colors used across map markers, schedule blocks, etc.
// Centralized here so a category's color only needs to change in one place.
export const category = {
  bus: '#dc2626',
  campusBoundary: '#dc2626',
  library: '#2563eb',
  userLocation: '#2563eb',
  locateActiveBg: '#dbeafe',
  dining: '#d97706',
  gym: '#16a34a',
  housing: '#6b7280',
  academics: '#6b7280',
  myDorm: { fill: '#f59e0b', border: '#78350f', bg: '#fef3c7', text: '#92400e' },
  myAcademic: { fill: '#7c3aed', border: '#4c1d95' },
  courses: [
    '#3B82F6',
    '#10B981',
    '#F59E0B',
    '#EC4899',
    '#8B5CF6',
    '#14B8A6',
    '#EF4444',
    '#6366F1',
    '#F97316',
    '#06B6D4',
  ],
} as const

export const colors = { brand, surface, state, category }
