import styled from '@emotion/styled'
import { radius } from '../radius'
import { state } from '../colors'

export type BadgeVariant = 'success' | 'danger' | 'neutral'

const VARIANTS: Record<BadgeVariant, { bg: string; color: string }> = {
  success: { bg: state.successSoft, color: state.success },
  danger: { bg: state.dangerSoft, color: state.danger },
  neutral: { bg: 'var(--bg-elevated)', color: 'var(--text-muted)' },
}

export const S = {
  Badge: styled.span<{ $variant: BadgeVariant }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
    padding: 3px 9px 3px 7px;
    border-radius: ${radius.pill};
    background: ${({ $variant }) => VARIANTS[$variant].bg};
    color: ${({ $variant }) => VARIANTS[$variant].color};
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  `,
  Dot: styled.span<{ $variant: BadgeVariant }>`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ $variant }) => VARIANTS[$variant].color};
  `,
}
