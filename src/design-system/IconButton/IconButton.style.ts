import styled from '@emotion/styled'
import { radius } from '../radius'
import { motion } from '../motion'

export const S = {
  IconButton: styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: ${radius.sm};
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text-muted);
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
    transition:
      color ${motion.duration.fast} ${motion.easing.standard},
      border-color ${motion.duration.fast} ${motion.easing.standard},
      transform ${motion.duration.fast} ${motion.easing.standard};

    &:hover {
      color: var(--text);
    }

    &:active {
      transform: scale(0.94);
    }

    &[aria-pressed='true'] {
      color: var(--accent);
      border-color: var(--accent);
    }
  `,
}
