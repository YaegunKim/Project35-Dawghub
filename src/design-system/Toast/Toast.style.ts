import styled from '@emotion/styled'
import { keyframes } from '@emotion/react'
import { radius } from '../radius'
import { spacing } from '../spacing'
import { shadow } from '../shadow'
import { motion, focusRing } from '../motion'
import { state } from '../colors'
import { zIndex } from '../zIndex'

export type ToastVariant = 'default' | 'danger'

const riseIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`

export const S = {
  Stack: styled.div`
    position: fixed;
    left: 50%;
    bottom: calc(${spacing['2xl']} + env(safe-area-inset-bottom));
    transform: translateX(-50%);
    z-index: ${zIndex.toast};
    display: flex;
    flex-direction: column-reverse;
    align-items: center;
    gap: ${spacing.sm};
    width: min(420px, calc(100vw - ${spacing.xl}));
  `,
  Toast: styled.div<{ $variant: ToastVariant }>`
    display: flex;
    align-items: center;
    gap: ${spacing.md};
    padding: ${spacing.sm} ${spacing.md} ${spacing.sm} ${spacing.base};
    border-radius: ${radius.pill};
    background: ${({ $variant }) => ($variant === 'danger' ? state.danger : 'var(--text)')};
    color: ${({ $variant }) => ($variant === 'danger' ? state.dangerContrast : 'var(--bg)')};
    box-shadow: ${shadow.modal};
    font-size: 13px;
    font-weight: 600;
    animation: ${riseIn} ${motion.duration.base} ${motion.easing.standard};
  `,
  Message: styled.span`
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  ActionButton: styled.button`
    flex-shrink: 0;
    border: none;
    background: none;
    padding: 0;
    color: inherit;
    font: inherit;
    font-weight: 700;
    text-decoration: underline;
    cursor: pointer;

    &:focus-visible {
      ${focusRing}
    }
  `,
}
