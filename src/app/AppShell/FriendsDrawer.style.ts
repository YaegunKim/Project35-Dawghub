import styled from '@emotion/styled'
import { keyframes } from '@emotion/react'
import { brand, state } from '../../design-system/colors'
import { radius } from '../../design-system/radius'
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

export const S = {
  // Inline trigger, meant to sit next to a page's own PageTitle (not fixed to the
  // viewport) — it scrolls away with the header instead of floating persistently,
  // per this app's no-fixed-top-bar convention (see CLAUDE.md).
  FriendsButton: styled.button`
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: ${spacing.sm};
    height: 36px;
    padding: 0 ${spacing.sm} 0 ${spacing.md};
    border: 1px solid var(--border);
    border-radius: ${radius.pill};
    background: var(--bg);
    color: var(--text);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: transform ${motion.duration.fast} ${motion.easing.standard};

    &:active {
      transform: scale(0.96);
    }
  `,
  FriendsButtonIcon: styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    border-radius: 50%;
    background: var(--accent);
    color: ${brand.white};
    font-size: 11px;
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
    width: min(360px, 90vw);
    display: flex;
    flex-direction: column;
    background: var(--bg);
    box-shadow: -8px 0 32px rgba(0, 0, 0, 0.2);
    animation: ${slideIn} ${motion.duration.base} ${motion.easing.standard};
  `,
  DrawerHeader: styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${spacing.sm};
    padding: ${spacing.base};
    padding-top: max(${spacing.base}, env(safe-area-inset-top));
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  `,
  DrawerTitle: styled.h2`
    margin: 0;
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 700;
  `,
  DrawerScroll: styled.div`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: ${spacing.sm} 0;
  `,
  Section: styled.div`
    padding: ${spacing.sm} ${spacing.base};
  `,
  SectionTitle: styled.div`
    padding: ${spacing.sm};
    font-size: 11px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  `,
  DrawerList: styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
  `,
  DrawerRow: styled.button`
    display: flex;
    align-items: center;
    gap: ${spacing.md};
    padding: ${spacing.md} ${spacing.sm};
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
  PendingRow: styled.div`
    display: flex;
    align-items: center;
    gap: ${spacing.sm};
    padding: ${spacing.sm};
    border-radius: ${radius.md};
    background: var(--bg-elevated);
  `,
  PendingActions: styled.div`
    display: flex;
    align-items: center;
    gap: ${spacing.xs};
    flex-shrink: 0;
  `,
  StaticRow: styled.div`
    display: flex;
    align-items: center;
    gap: ${spacing.md};
    padding: ${spacing.md} ${spacing.sm};
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
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: ${({ $active }) => ($active ? 'var(--text)' : 'var(--text-muted)')};
  `,
  DrawerRowSubtitle: styled.span`
    font-size: 12px;
    color: var(--text-muted);
  `,
  AddFriendForm: styled.form`
    display: flex;
    flex-direction: column;
    gap: ${spacing.xs};
    padding: ${spacing.base};
    padding-bottom: max(${spacing.base}, env(safe-area-inset-bottom));
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  `,
  AddFriendRow: styled.div`
    display: flex;
    align-items: center;
    gap: ${spacing.sm};

    > input {
      flex: 1;
      min-width: 0;
    }
  `,
  AddFriendError: styled.div`
    font-size: 12px;
    color: ${state.danger};
  `,
}
