import styled from '@emotion/styled'
import { radius } from '../radius'
import { shadow } from '../shadow'
import { motion, focusRing } from '../motion'

export type IconButtonSize = 'sm' | 'lg'

export const S = {
  IconButton: styled.button<{ $size: IconButtonSize }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border);
    background: var(--bg);
    line-height: 1;
    cursor: pointer;
    transition:
      color ${motion.duration.fast} ${motion.easing.standard},
      border-color ${motion.duration.fast} ${motion.easing.standard},
      transform ${motion.duration.fast} ${motion.easing.standard};

    &:active {
      transform: scale(0.94);
    }

    &:focus-visible {
      ${focusRing}
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    ${({ $size }) =>
      $size === 'lg'
        ? `
      width: 44px;
      height: 44px;
      border-radius: ${radius.pill};
      color: var(--text);
      font-size: 18px;
      box-shadow: ${shadow.floating};

      &[aria-pressed='true'] {
        color: var(--accent);
      }
    `
        : `
      width: 28px;
      height: 28px;
      border-radius: ${radius.sm};
      color: var(--text-muted);
      font-size: 16px;

      &:hover {
        color: var(--text);
      }

      &[aria-pressed='true'] {
        color: var(--accent);
        border-color: var(--accent);
      }
    `}
  `,
}
