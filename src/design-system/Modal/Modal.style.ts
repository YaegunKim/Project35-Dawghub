import styled from '@emotion/styled'
import { keyframes } from '@emotion/react'
import { motion } from '../motion'
import { radius } from '../radius'
import { shadow } from '../shadow'
import { zIndex } from '../zIndex'

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const modalIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.94) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
`

export const S = {
  Backdrop: styled.div`
    position: fixed;
    inset: 0;
    z-index: ${zIndex.modal};
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: rgba(0, 0, 0, 0.5);
    animation: ${fadeIn} ${motion.duration.fast} ${motion.easing.standard};
  `,
  Panel: styled.div<{ $maxWidth: string; $maxWidthTablet?: string; $maxHeight: string }>`
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: ${({ $maxWidth }) => $maxWidth};
    max-height: ${({ $maxHeight }) => $maxHeight};
    border-radius: ${radius.lg};
    overflow: hidden;
    background: var(--bg);
    box-shadow: ${shadow.modal};
    animation: ${modalIn} ${motion.duration.base} ${motion.easing.standard};

    ${({ $maxWidthTablet }) =>
      $maxWidthTablet &&
      `
      @media (min-width: 768px) {
        max-width: ${$maxWidthTablet};
      }
    `}
  `,
}
