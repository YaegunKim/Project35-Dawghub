import styled from '@emotion/styled'
import { radius } from '../radius'
import { spacing } from '../spacing'
import { typography } from '../typography'
import { motion, focusRing } from '../motion'
import { state } from '../colors'

// 'accent' is the common case (a plain single-select toggle, e.g. language/theme). 'neutral'
// and 'danger' are an escape hatch for a control where one option needs to read as
// destructive — DawgHub's brand accent is itself a shade of red, so a "hide"-style danger
// option sitting next to an accent-colored default would be visually indistinguishable from
// the danger option; 'neutral' (plain gray) keeps that contrast meaningful.
export type SegmentedControlVariant = 'accent' | 'neutral' | 'danger'

const ACTIVE_BG: Record<SegmentedControlVariant, string> = {
  accent: 'var(--accent)',
  neutral: 'var(--border)',
  danger: state.danger,
}

const ACTIVE_COLOR: Record<SegmentedControlVariant, string> = {
  accent: 'var(--accent-contrast)',
  neutral: 'var(--text)',
  danger: state.dangerContrast,
}

export const S = {
  Group: styled.div`
    display: inline-flex;
    padding: 2px;
    background: var(--bg-elevated);
    border-radius: ${radius.pill};
    flex-shrink: 0;
  `,
  Segment: styled.button<{ $active: boolean; $variant: SegmentedControlVariant }>`
    padding: ${spacing.sm} ${spacing.md};
    border: none;
    border-radius: ${radius.pill};
    font-size: ${typography.size.sm};
    font-weight: ${typography.weight.semibold};
    cursor: pointer;
    white-space: nowrap;
    transition:
      background-color ${motion.duration.fast} ${motion.easing.standard},
      color ${motion.duration.fast} ${motion.easing.standard};
    background: ${({ $active, $variant }) => ($active ? ACTIVE_BG[$variant] : 'transparent')};
    color: ${({ $active, $variant }) => ($active ? ACTIVE_COLOR[$variant] : 'var(--text-muted)')};

    &:focus-visible {
      ${focusRing}
    }
  `,
}
