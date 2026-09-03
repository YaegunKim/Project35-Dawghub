import styled from '@emotion/styled'
import { keyframes } from '@emotion/react'
import { radius } from '../radius'
import { spacing } from '../spacing'
import { typography } from '../typography'
import { motion, focusRing } from '../motion'
import { state } from '../colors'

const SIZES = {
  sm: { height: '32px', padding: `0 ${spacing.sm}`, fontSize: typography.size.sm },
  md: { height: '40px', padding: `0 ${spacing.base}`, fontSize: typography.size.md },
  lg: { height: '48px', padding: `0 ${spacing.lg}`, fontSize: typography.size.lg },
} as const

export type ButtonVariant = 'primary' | 'secondary' | 'danger'
export type ButtonSize = keyof typeof SIZES

const spin = keyframes`
  to { transform: rotate(360deg); }
`

export const S = {
  Button: styled.button<{ $variant: ButtonVariant; $size: ButtonSize; $fullWidth: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: ${spacing.sm};
    width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
    height: ${({ $size }) => SIZES[$size].height};
    padding: ${({ $size }) => SIZES[$size].padding};
    border-radius: ${radius.sm};
    font-size: ${({ $size }) => SIZES[$size].fontSize};
    font-weight: ${typography.weight.semibold};
    border: 1px solid transparent;
    cursor: pointer;
    transition:
      opacity ${motion.duration.fast} ${motion.easing.standard},
      background-color ${motion.duration.fast} ${motion.easing.standard},
      transform ${motion.duration.fast} ${motion.easing.standard};

    &:active {
      opacity: 0.8;
      transform: scale(0.97);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &:focus-visible {
      ${focusRing}
    }

    ${({ $variant }) => {
      if ($variant === 'secondary') {
        return `
          background: var(--bg-elevated);
          color: var(--text);
          border-color: var(--border);
        `
      }
      if ($variant === 'danger') {
        return `
          background: ${state.danger};
          color: ${state.dangerContrast};
        `
      }
      return `
        background: var(--accent);
        color: var(--accent-contrast);
      `
    }}
  `,
  Spinner: styled.span`
    width: 1em;
    height: 1em;
    border-radius: 50%;
    border: 2px solid currentColor;
    border-top-color: transparent;
    opacity: 0.8;
    animation: ${spin} 0.6s linear infinite;
  `,
}
