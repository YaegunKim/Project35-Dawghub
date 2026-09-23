import styled from '@emotion/styled'
import { keyframes } from '@emotion/react'
import { brand } from '../../design-system/colors'
import { radius } from '../../design-system/radius'
import { shadow } from '../../design-system/shadow'
import { spacing } from '../../design-system/spacing'
import { motion } from '../../design-system/motion'
import { zIndex } from '../../design-system/zIndex'

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const slideIn = keyframes`
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
`

const dropIn = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
`

const slideUp = keyframes`
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
`

export const S = {
  Root: styled.div`
    position: relative;
    flex: 1;
    min-height: 0;
  `,
  MapContainer: styled.div`
    position: absolute;
    inset: 0;
  `,
  // Positioning-only wrapper — the button's own visuals come from IconButton size="lg".
  LayersButtonSlot: styled.div`
    position: absolute;
    top: ${spacing.base};
    right: ${spacing.base};
    z-index: ${zIndex.overlay};
  `,
  // Top-anchored, viewport-relative pick-mode hint — used for every "tap a spot on the map"
  // flow (Schedule's "set location" via the 'return' pickingFor case, and Directions' own
  // origin/destination picking). Deliberately not nested inside DirectionsBottomSheet: that
  // sheet is bottom-docked with overflow-y:auto, so an absolutely-positioned child trying to
  // float above it would get clipped by the sheet's own scroll container — anchoring to the
  // top of the screen instead avoids that entirely.
  PickToast: styled.div`
    position: absolute;
    top: max(${spacing.base}, env(safe-area-inset-top));
    left: 50%;
    transform: translateX(-50%);
    z-index: ${zIndex.overlay + 50};
    display: flex;
    align-items: center;
    gap: ${spacing.sm};
    padding: ${spacing.sm} ${spacing.md};
    border-radius: ${radius.pill};
    background: var(--text);
    color: var(--bg);
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    box-shadow: ${shadow.md};
    animation: ${dropIn} ${motion.duration.base} ${motion.easing.standard};
  `,
  PickToastCancel: styled.button`
    border: none;
    background: none;
    padding: 0;
    color: inherit;
    font: inherit;
    font-weight: 700;
    text-decoration: underline;
    cursor: pointer;
    flex-shrink: 0;
  `,
  BusButtonRow: styled.div`
    position: absolute;
    top: ${spacing.base};
    left: ${spacing.base};
    z-index: ${zIndex.overlay};
    display: flex;
    align-items: center;
    gap: ${spacing.sm};
  `,
  // Always-on per-route quick toggle, independent of the BusButtonRow/BusSheet open state —
  // kept alongside the sheet below rather than replaced by it, so a route can be flipped
  // on/off on the map without opening the fuller sheet first.
  BusPanel: styled.div`
    position: absolute;
    top: calc(${spacing.base} + 44px + ${spacing.sm});
    left: ${spacing.base};
    z-index: ${zIndex.overlay};
    width: 44px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${spacing.sm};
    animation: ${dropIn} ${motion.duration.base} ${motion.easing.standard};
  `,
  BusRouteGrid: styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${spacing.xs};
  `,
  BusRouteBadge: styled.button<{ $background: string; $enabled: boolean; $operating: boolean }>`
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    flex-shrink: 0;
    border: none;
    border-radius: 50%;
    font-size: 10px;
    font-weight: 700;
    color: ${brand.white};
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
    background-color: ${({ $background }) => $background};
    background-image: ${({ $operating }) =>
      $operating
        ? 'none'
        : 'repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.65) 0, rgba(255, 255, 255, 0.65) 1px, transparent 1px, transparent 5px)'};
    opacity: ${({ $enabled }) => ($enabled ? 1 : 0.35)};
    cursor: pointer;
    transition:
      opacity ${motion.duration.fast} ${motion.easing.standard},
      transform ${motion.duration.fast} ${motion.easing.standard};

    &:active {
      transform: scale(0.92);
    }
  `,
  // Docked to the bottom edge — same shape as DirectionsBottomSheet. Complements BusPanel
  // above: BusPanel is the always-on per-route on/off toggle, this sheet is the richer
  // "browse a route's stops/timeline, favorite it, see Athens Transit routes too" view opened
  // from the BusButtonRow bus icon. Pulled up from a closed default (no sheet content drawn
  // until opened — see mapLayerPrefs.ts).
  BusSheet: styled.div`
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: ${zIndex.overlay + 50};
    max-height: 42vh;
    display: flex;
    flex-direction: column;
    gap: ${spacing.sm};
    padding: ${spacing.base};
    padding-bottom: max(${spacing.base}, env(safe-area-inset-bottom));
    border-top-left-radius: ${radius.lg};
    border-top-right-radius: ${radius.lg};
    background: var(--bg);
    box-shadow: ${shadow.sheetUp};
    animation: ${slideUp} ${motion.duration.base} ${motion.easing.standard};
    overflow-y: auto;
  `,
  BusSheetDetailHeader: styled.div`
    display: flex;
    align-items: center;
    gap: ${spacing.sm};
  `,
  BusSheetDetailTitle: styled.h2`
    flex: 1;
    min-width: 0;
    margin: 0;
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  // Reused for both the list view's per-row star and the detail view's header star — filled
  // accent color once favorited, muted otherwise (same on/off opacity language the old
  // BusRouteBadge used for enabled/disabled routes).
  BusFavoriteButton: styled.button<{ $active: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    border: none;
    background: transparent;
    color: ${({ $active }) => ($active ? 'var(--accent)' : 'var(--text-muted)')};
    font-size: 16px;
    cursor: pointer;
    transition: color ${motion.duration.fast} ${motion.easing.standard};
  `,
  // A plain div, not DrawerRow — DrawerRow is itself a <button>, and this row needs a
  // separately-clickable favorite star next to the "open this route" button, which HTML
  // doesn't allow nesting inside another button.
  BusSheetRouteRow: styled.div`
    display: flex;
    align-items: center;
    gap: ${spacing.sm};
  `,
  BusSheetRouteRowButton: styled.button`
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: ${spacing.md};
    padding: ${spacing.md} 0;
    border: none;
    background: transparent;
    color: var(--text);
    font: inherit;
    text-align: left;
    cursor: pointer;
  `,
  BusSheetStatusLine: styled.div`
    font-size: 13px;
    color: var(--text-muted);
  `,
  BusSheetSettingsRow: styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${spacing.sm};
    margin-top: ${spacing.xs};
    padding-top: ${spacing.md};
    border: none;
    border-top: 1px solid var(--border);
    background: transparent;
    color: var(--text-muted);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: color ${motion.duration.fast} ${motion.easing.standard};

    &:hover {
      color: var(--text);
    }
  `,
  DrawerBackdrop: styled.div`
    position: fixed;
    inset: 0;
    z-index: ${zIndex.drawer};
    background: rgba(0, 0, 0, 0.4);
    animation: ${fadeIn} ${motion.duration.base} ${motion.easing.standard};
  `,
  Drawer: styled.div`
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: ${zIndex.drawer + 1};
    width: min(340px, 88vw);
    display: flex;
    flex-direction: column;
    background: var(--bg);
    box-shadow: ${shadow.drawerRight};
    animation: ${slideIn} ${motion.duration.base} ${motion.easing.standard};
    overflow-y: auto;
  `,
  DrawerHeader: styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${spacing.sm};
    padding: ${spacing.base};
    border-bottom: 1px solid var(--border);
  `,
  DrawerTitle: styled.h2`
    margin: 0;
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 700;
  `,
  DrawerList: styled.div`
    display: flex;
    flex-direction: column;
    padding: ${spacing.sm};
  `,
  DrawerRow: styled.button`
    display: flex;
    align-items: center;
    gap: ${spacing.md};
    padding: ${spacing.md};
    border: none;
    border-radius: ${radius.md};
    background: transparent;
    color: var(--text);
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: background-color ${motion.duration.fast} ${motion.easing.standard};

    &:hover {
      background: var(--bg-elevated);
    }
  `,
  DrawerRowText: styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
  `,
  DrawerRowLabel: styled.span<{ $active: boolean }>`
    font-size: 14px;
    font-weight: 600;
    color: ${({ $active }) => ($active ? 'var(--text)' : 'var(--text-muted)')};
  `,
  DrawerRowSubtitle: styled.span`
    font-size: 12px;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  DrawerRowChevron: styled.span`
    flex-shrink: 0;
    color: var(--text-muted);
    font-size: 13px;
  `,
  ModalHeader: styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${spacing.sm};
    padding: ${spacing.base};
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  `,
  ModalTitle: styled.h2`
    margin: 0;
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 700;
  `,
  ModalBody: styled.div`
    display: flex;
    flex-direction: column;
    gap: ${spacing.lg};
    padding: ${spacing.base};
    overflow-y: auto;
  `,
  ModalSection: styled.div`
    display: flex;
    flex-direction: column;
    gap: ${spacing.sm};
  `,
  ModalSectionTitle: styled.div`
    font-size: 11px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  `,
  MasterToggleRow: styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${spacing.sm};
  `,
  MasterToggleLabel: styled.span`
    font-size: 14px;
    font-weight: 600;
  `,
  Switch: styled.button<{ $checked: boolean }>`
    position: relative;
    width: 44px;
    height: 26px;
    flex-shrink: 0;
    border: none;
    border-radius: ${radius.pill};
    background: ${({ $checked }) => ($checked ? 'var(--accent)' : 'var(--border)')};
    cursor: pointer;
    transition: background-color ${motion.duration.fast} ${motion.easing.standard};

    &::after {
      content: '';
      position: absolute;
      top: 3px;
      left: ${({ $checked }) => ($checked ? '21px' : '3px')};
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: ${brand.white};
      box-shadow: ${shadow.knob};
      transition: left ${motion.duration.fast} ${motion.easing.standard};
    }
  `,
  RadioGroup: styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
  `,
  RadioRow: styled.label`
    display: flex;
    align-items: center;
    gap: ${spacing.sm};
    padding: 8px 4px;
    font-size: 14px;
    color: var(--text);
    cursor: pointer;

    input {
      accent-color: var(--accent);
      width: 16px;
      height: 16px;
    }
  `,
  ChecklistGroup: styled.div`
    display: flex;
    flex-direction: column;
    max-height: 220px;
    overflow-y: auto;
  `,
  ChecklistRow: styled.label`
    display: flex;
    align-items: center;
    gap: ${spacing.sm};
    padding: 6px 4px;
    font-size: 14px;
    color: var(--text);
    cursor: pointer;

    input {
      accent-color: var(--accent);
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }
  `,
  ChecklistEmpty: styled.div`
    font-size: 13px;
    color: var(--text-muted);
  `,
  LayerChipIcon: styled.span<{ $background: string }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    font-size: 11px;
    color: ${brand.white};
    background: ${({ $background }) => $background};
    flex-shrink: 0;
  `,
  DirectionsButtonSlot: styled.div`
    position: absolute;
    top: calc(${spacing.base} + 44px + ${spacing.sm});
    right: ${spacing.base};
    z-index: ${zIndex.overlay};
  `,
  // Docked to the bottom edge, like the bus sheet — carries both the origin/destination
  // input fields (shown as soon as Directions opens) and, once a search runs, the results
  // list/nav HUD beneath them, all in one scrollable sheet instead of a separate top bar +
  // bottom sheet pair. Bottom-docked rather than top like Google/Naver Maps' own directions
  // panels, matching every other panel in this app (bus sheet, layer drawer) instead of
  // being the one exception pinned to the top.
  DirectionsBottomSheet: styled.div`
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: ${zIndex.overlay + 50};
    max-height: 45vh;
    display: flex;
    flex-direction: column;
    gap: ${spacing.sm};
    padding: ${spacing.base};
    padding-bottom: max(${spacing.base}, env(safe-area-inset-bottom));
    border-top-left-radius: ${radius.lg};
    border-top-right-radius: ${radius.lg};
    background: var(--bg);
    box-shadow: ${shadow.sheetUp};
    animation: ${slideUp} ${motion.duration.base} ${motion.easing.standard};
    overflow-y: auto;
  `,
  // Row layout: fields column (flex: 1) + a fixed-width actions column (swap/close) — the
  // actions column's own height (two 28px buttons + gap) sits well inside the fields
  // column's height (two 40px input rows + gap), so it centers for free with no separate
  // header row or hardcoded pixel offsets needed.
  DirectionsFieldsWrap: styled.div`
    display: flex;
    align-items: center;
    gap: ${spacing.sm};
  `,
  DirectionsFieldsColumn: styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: ${spacing.sm};
  `,
  DirectionsActionsColumn: styled.div`
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${spacing.xs};
  `,
  DirectionsSwapButton: styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    border: 1px solid var(--border);
    border-radius: 50%;
    background: var(--bg);
    color: var(--text-muted);
    font-size: 12px;
    cursor: pointer;
    transition: color ${motion.duration.fast} ${motion.easing.standard};

    &:hover {
      color: var(--accent);
    }
  `,
  DirectionsCloseButton: styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    border: 1px solid var(--border);
    border-radius: ${radius.sm};
    background: var(--bg);
    color: var(--text-muted);
    font-size: 14px;
    cursor: pointer;
    transition: color ${motion.duration.fast} ${motion.easing.standard};

    &:hover {
      color: var(--text);
    }
  `,
  // Small circle for the origin, small square for the destination — same shorthand Google
  // Maps uses so the from/to rows read at a glance without needing "FROM"/"TO" labels
  // (those were dropped to save vertical space; the placeholder text still says it).
  DirectionsFieldDot: styled.span<{ $color: string; $shape?: 'circle' | 'square' }>`
    width: 8px;
    height: 8px;
    flex-shrink: 0;
    border-radius: ${({ $shape }) => ($shape === 'square' ? '2px' : '50%')};
    background: ${({ $color }) => $color};
  `,
  DirectionsFieldRow: styled.div`
    display: flex;
    align-items: center;
    gap: ${spacing.xs};
  `,
  DirectionsIconButton: styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    border: 1px solid var(--border);
    border-radius: ${radius.md};
    background: var(--bg);
    color: var(--text);
    font-size: 14px;
    cursor: pointer;
    transition: color ${motion.duration.fast} ${motion.easing.standard};

    &:hover {
      color: var(--accent);
    }
  `,
  // Compact primary action, deliberately not the shared Button (fixed 40px height) — this
  // bar is trying to stay as short as possible, so it gets its own slimmer local button.
  DirectionsSearchButton: styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${spacing.xs};
    height: 32px;
    border: none;
    border-radius: ${radius.md};
    background: var(--accent);
    color: var(--accent-contrast);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition:
      opacity ${motion.duration.fast} ${motion.easing.standard},
      transform ${motion.duration.fast} ${motion.easing.standard};

    &:active {
      opacity: 0.8;
      transform: scale(0.98);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
  // A small centered bar at the top of the sheet — purely decorative (the sheet itself
  // doesn't drag), but it's the visual shorthand people already read as "bottom sheet" from
  // every native app, so it's cheap polish for very little markup.
  BottomSheetHandle: styled.div`
    align-self: center;
    width: 36px;
    height: 4px;
    border-radius: ${radius.pill};
    background: var(--border);
    margin-bottom: ${spacing.xs};
  `,
  TripOptionList: styled.div`
    display: flex;
    flex-direction: column;
    gap: ${spacing.sm};
  `,
  // A row, not a button — it now holds two independently-clickable things (the
  // select-this-option content and, only when already selected, the Go button), so only
  // TripOptionRowContent is the actual button.
  TripOptionRow: styled.div<{ $selected: boolean }>`
    display: flex;
    align-items: center;
    gap: ${spacing.sm};
    padding: ${spacing.sm};
    border: 1px solid ${({ $selected }) => ($selected ? 'var(--accent)' : 'var(--border)')};
    border-radius: ${radius.md};
    background: ${({ $selected }) => ($selected ? 'var(--bg-elevated)' : 'var(--bg)')};
    transition: border-color ${motion.duration.fast} ${motion.easing.standard};
  `,
  TripOptionRowContent: styled.button`
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: ${spacing.sm};
    border: none;
    background: none;
    padding: 0;
    color: var(--text);
    text-align: left;
    font: inherit;
    cursor: pointer;
  `,
  // Holds one badge for a direct trip, or two (one per ridden route) for a one-transfer trip —
  // a plain row is enough since TripOptionIconBadge is already a fixed 36px circle.
  TripOptionIconBadgeGroup: styled.span`
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  `,
  // Reuses the same colored-circle badge language as LayerChipIcon elsewhere on this page —
  // walk gets the fixed teal directionsWalk color, bus gets that specific route's own color
  // so the badge previews which route you'd actually be boarding before you even select it.
  TripOptionIconBadge: styled.span<{ $color: string }>`
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: ${({ $color }) => $color};
    color: ${brand.white};
    font-size: 15px;
    font-weight: 700;
  `,
  TripOptionText: styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  `,
  // Duration leads (Google Maps-style) instead of the mode label — it's what actually
  // differentiates the two options at a glance.
  TripOptionDuration: styled.div`
    font-size: 17px;
    font-weight: 700;
    line-height: 1.2;
  `,
  TripOptionMeta: styled.div`
    font-size: 12px;
    color: var(--text-muted);
  `,
  TripOptionApproxNote: styled.div`
    font-size: 11px;
    color: var(--text-muted);
    font-style: italic;
  `,
  GoButton: styled.button`
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: ${spacing.xs};
    height: 36px;
    padding: 0 ${spacing.md};
    border: none;
    border-radius: ${radius.pill};
    background: var(--accent);
    color: var(--accent-contrast);
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition:
      opacity ${motion.duration.fast} ${motion.easing.standard},
      transform ${motion.duration.fast} ${motion.easing.standard};

    &:active {
      opacity: 0.8;
      transform: scale(0.96);
    }
  `,
  TripEmptyState: styled.div`
    font-size: 13px;
    color: var(--text-muted);
  `,
  // Replaces the trip option list while live navigation is running — same bottom sheet, just
  // different content, so it keeps the sheet's own dimensions/animation instead of needing a
  // separate docked element.
  NavHud: styled.div`
    display: flex;
    flex-direction: column;
    gap: ${spacing.sm};
  `,
  NavHudTopRow: styled.div`
    display: flex;
    align-items: center;
    gap: ${spacing.sm};
  `,
  NavHudLegIcon: styled.span<{ $color: string }>`
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: ${({ $color }) => $color};
    color: ${brand.white};
    font-size: 16px;
    font-weight: 700;
  `,
  NavHudInstruction: styled.div`
    flex: 1;
    min-width: 0;
    font-size: 16px;
    font-weight: 700;
    line-height: 1.3;
  `,
  NavHudMeta: styled.div`
    font-size: 13px;
    color: var(--text-muted);
  `,
  // Segmented progress bar, one piece per leg, each sized proportionally to that leg's
  // distance ($weight below feeds flex-grow) — not equal-width segments, so a short bus hop
  // between two long walks reads as the short middle piece it actually is.
  NavProgressTrack: styled.div`
    display: flex;
    gap: 2px;
    height: 6px;
    border-radius: ${radius.pill};
    overflow: hidden;
  `,
  NavProgressSegment: styled.div<{ $color: string; $weight: number; $state: 'done' | 'active' | 'upcoming' }>`
    flex-grow: ${({ $weight }) => $weight};
    flex-basis: 0;
    border-radius: ${radius.pill};
    background: ${({ $color }) => $color};
    opacity: ${({ $state }) => ($state === 'upcoming' ? 0.25 : 1)};
    box-shadow: ${({ $state }) => ($state === 'active' ? '0 0 0 1px var(--bg), 0 0 0 2px var(--accent)' : 'none')};
    transition: opacity ${motion.duration.base} ${motion.easing.standard};
  `,
}
