// A shared stacking-order scale — before this, each page invented its own z-index numbers
// (Schedule used 1-32, Map used 1000-1200, AppShell used 10), which made it a guess every
// time a new overlay was added. A backdrop/content pair within the same tier is expressed as
// `zIndex.tier` / `zIndex.tier + 1` rather than as two separate named tokens.
export const zIndex = {
  raised: 1, // sticky headers within their own scroll container, in-flow hover raise
  chrome: 10, // persistent app-level chrome above routed page content (e.g. the bottom tab bar)
  fab: 20, // floating action button and its dismiss-on-click-outside backdrop
  dropdown: 30, // anchored dropdown/filter menus and their backdrop
  overlay: 1000, // controls/toolbars floating over full-bleed content (e.g. the map)
  drawer: 1100, // slide-in side drawers and their backdrop
  modal: 1200, // centered modal dialogs — always topmost
} as const
