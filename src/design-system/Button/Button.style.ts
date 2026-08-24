import styled from '@emotion/styled'
import { radius } from '../radius'
import { motion } from '../motion'

export const S = {
  Button: styled.button<{ $variant: 'primary' | 'secondary' }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 40px;
    padding: 0 16px;
    border-radius: ${radius.sm};
    font-size: 14px;
    font-weight: 600;
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

    ${({ $variant }) =>
      $variant === 'primary'
        ? `
      background: var(--accent);
      color: var(--accent-contrast);
    `
        : `
      background: var(--bg-elevated);
      color: var(--text);
      border-color: var(--border);
    `}
  `,
}
