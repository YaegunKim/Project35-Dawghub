export const shadow = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.04)',
  md: '0 4px 16px rgba(0, 0, 0, 0.08)',
  // Resting/hover elevation for draggable-feeling surfaces (e.g. schedule grid blocks).
  resting: '0 1px 3px rgba(0, 0, 0, 0.2)',
  hover: '0 2px 8px rgba(0, 0, 0, 0.3)',
  // Small circular/pill buttons floating over content (map corner buttons).
  floating: '0 2px 8px rgba(0, 0, 0, 0.16)',
  // Compact floating menus/cards (e.g. a FAB's popup menu).
  card: '0 4px 16px rgba(0, 0, 0, 0.16)',
  // A prominent circular FAB.
  fab: '0 4px 12px rgba(0, 0, 0, 0.25)',
  // Dropdown/filter menus anchored to a trigger.
  lg: '0 8px 24px rgba(0, 0, 0, 0.18)',
  // Centered modal/dialog overlays.
  modal: '0 20px 60px rgba(0, 0, 0, 0.35)',
  // Panels docked to a screen edge.
  drawerRight: '-8px 0 32px rgba(0, 0, 0, 0.2)',
  sheetUp: '0 -8px 24px rgba(0, 0, 0, 0.18)',
  // A toggle switch's knob.
  knob: '0 1px 3px rgba(0, 0, 0, 0.3)',
  // A subtly-raised active tab.
  tabActive: '0 1px 3px rgba(0, 0, 0, 0.12)',
} as const
