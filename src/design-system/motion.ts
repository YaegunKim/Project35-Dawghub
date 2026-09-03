export const motion = {
  duration: {
    fast: '120ms',
    base: '200ms',
    slow: '320ms',
  },
  easing: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const

// Shared keyboard-focus ring — apply as `&:focus-visible { ${focusRing} }` on any interactive
// primitive (buttons, inputs, selects). Deliberately `:focus-visible`, not `:focus`, so a mouse
// click doesn't show the ring, only keyboard/assistive-tech navigation does.
export const focusRing = `
  outline: 2px solid var(--accent);
  outline-offset: 2px;
`
