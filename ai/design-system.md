# Design system

## Purpose

`src/design-system/` holds the tokens (colors/spacing/typography/radius/shadow/motion/z-index) and the shared component primitives every page builds on. Restructured in 2026-09 after researching Toss Design System and Danggeun Market's Seed Design — see "Extension principle" below for the rule that came out of that research.

## Tokens

| File | What it holds | When to add a new value |
|---|---|---|
| `colors.ts` | `brand` (fixed brand colors), `surface` (re-exports the theme CSS variables), `state` (danger/success, each with a `Soft` background pair and a `Contrast` text color for solid use), `category` (map/schedule category colors) | Add under the existing group that matches its role — don't invent a 5th group. A new state color needs a `Soft` variant if it's ever shown as a badge/soft background, and a `Contrast` variant if it's ever a solid background with text on top. |
| `spacing.ts` | 4px-grid scale (`xs` 4px … `4xl` 48px) | Only add a new step if an existing one truly doesn't fit — most spacing decisions should reuse `sm`/`md`/`base`. |
| `typography.ts` | `fontFamily.body`/`display`, `size` scale, `weight` scale | Add a new `size` step only if a real heading/label tier needs it — most text should reuse `sm`/`md`/`lg`. |
| `radius.ts` | `sm`/`md`/`lg`/`pill` | Rarely needs new entries — `pill` covers fully-rounded, `lg` covers modals/cards, `sm`/`md` cover inputs/buttons. |
| `shadow.ts` | A full elevation scale (`resting`/`hover`/`floating`/`card`/`fab`/`lg`/`modal`/`drawerRight`/`sheetUp`/`knob`/`tabActive`, plus `sm`/`md`) | If none of these fit a new surface, add a new **named** tier here — never write an inline `box-shadow: rgba(...)` in a page's `.style.ts`. |
| `motion.ts` | `duration`/`easing`, plus `focusRing` (a `:focus-visible` outline snippet) | Apply `focusRing` to any new interactive primitive: `` &:focus-visible { ${focusRing} } ``. |
| `zIndex.ts` | A 7-tier stacking scale: `raised`(1) → `chrome`(10) → `fab`(20) → `dropdown`(30) → `overlay`(1000) → `drawer`(1100) → `modal`(1200) | Never write a raw `z-index: <number>`. Pick the tier that matches the UI role, and use `zIndex.tier + 1` for a backdrop/content pair that are DOM *siblings* (content nested inside its own backdrop doesn't need an offset — it stacks above for free). A dropdown that can open *while a modal is already open* needs `zIndex.modal + N`, not the generic `dropdown` tier — see the comment above `SchedulePage.style.ts`'s `FilterMenuBackdrop` for a worked example. |

## Components

All primitives live in their own folder (`ComponentName/ComponentName.tsx` + `.style.ts`), following the existing `export const S = {...}` / `<S.Thing>` convention (see CLAUDE.md's Style rules).

| Component | Props | Notes |
|---|---|---|
| `Button` | `variant?: 'primary'\|'secondary'\|'danger'`, `size?: 'sm'\|'md'\|'lg'`, `fullWidth?: boolean`, `loading?: boolean` | `loading` shows a spinner and disables the button. `danger` is a solid red button (destructive actions, e.g. "Delete class") — don't reach for `styled(Button)` to fake a variant. |
| `IconButton` | `size?: 'sm'\|'lg'` | `sm` (28px square, default) is the general small icon button. `lg` (44px circle, `shadow.floating`) is for a corner-floating button over full-bleed content (map controls) — use `aria-pressed` for a toggled/active state on either size. |
| `Input` / `Textarea` / `Select` | native props | Plain styled wrappers around the native elements — token-driven padding/radius/font-size, with a `:focus-visible` ring. |
| `Card` / `CardLink` | native `div`/`react-router-dom` `Link` props | `CardLink` is a `Card` that navigates on click (adds an active-press scale). |
| `Badge` | `variant: 'success'\|'danger'\|'neutral'`, `children` | A dot + text status pill (e.g. "Open"/"Closed"). Pairs color with a dot + label, never color alone. |
| `SegmentedControl<T>` | `options: {value: T, label: string}[]`, `value: T`, `onChange`, `getVariant?: (value, active) => 'accent'\|'neutral'\|'danger'` | The flat `options`/`value`/`onChange` API covers the common single-select toggle (defaults to an accent-colored active pill). `getVariant` is the escape hatch for a control where one option should read as neutral/destructive instead — needed because DawgHub's brand accent is itself a shade of red, so an accent-colored "active" state next to a `danger` option would look identical to it without this. |
| `Modal` | `onClose`, `children`, `maxWidth?`, `maxWidthTablet?`, `maxHeight?` | Backdrop (click-to-close) + centered panel shell (`shadow.modal`, `radius.lg`, entrance animation, `zIndex.modal`). Header/body layout stays page-specific — pass them as `children`, don't try to force a single header API on every use case. |
| `Page` / `PageTitle` | — | The shared route-level container (`max-width` 720px → 960px at 1024px+) and `<h1>` title style. |
| `Skeleton` | `width?`, `height?`, `radius?` | Shimmer loading placeholder. |
| `EmptyState` | `children` | Plain muted-text empty/error message. |
| `BackLink` | `to`, `children` | "← back" navigation link. |

Example — a destructive action button plus a status badge:
```tsx
<Button variant="danger" onClick={handleDelete}>{t('schedule.delete')}</Button>
<Badge variant={openNow ? 'success' : 'danger'}>{t(openNow ? 'dining.open' : 'dining.closed')}</Badge>
```

## Extension principle

**Promote a pattern to `design-system/` only once it's genuinely repeated in at least two places** — not preemptively. This came directly out of researching Toss's and Danggeun Market's own engineering write-ups: Toss explicitly validates a component against real usage before investing in it ("이 컴포넌트를 만들면 사람들이 잘 쓸까?"), rather than building a shared component for a single call site.

Concretely in this codebase: the iOS-style toggle `Switch` in `MapPage.style.ts` is *not* in `design-system/` yet, even though it's a perfectly generic-looking atom — it only has one caller today. If a second page needs the same toggle, promote it then (following the `Badge`/`SegmentedControl` pattern above: extract the shared visual, keep any page-specific wiring where it is).
