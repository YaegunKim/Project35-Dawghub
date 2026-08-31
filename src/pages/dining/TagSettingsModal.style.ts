import styled from '@emotion/styled'
import { keyframes } from '@emotion/react'
import { radius } from '../../design-system/radius'
import { spacing } from '../../design-system/spacing'
import { motion } from '../../design-system/motion'

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

export const S = {
  ModalBackdrop: styled.div`
    position: fixed;
    inset: 0;
    z-index: 1200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: ${spacing.base};
    background: rgba(0, 0, 0, 0.5);
    animation: ${fadeIn} ${motion.duration.fast} ${motion.easing.standard};
  `,
  Modal: styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 380px;
    max-height: 80vh;
    border-radius: ${radius.lg};
    background: var(--bg);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
    overflow: hidden;
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
  Section: styled.div`
    display: flex;
    flex-direction: column;
    gap: ${spacing.xs};
  `,
  SectionTitle: styled.div`
    font-size: 11px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 2px;
  `,
  Row: styled.label`
    display: flex;
    align-items: center;
    gap: ${spacing.sm};
    padding: 6px 4px;
    cursor: pointer;

    input {
      accent-color: var(--accent);
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }
  `,
  RowIcon: styled.img`
    width: 22px;
    height: 22px;
    object-fit: contain;
    flex-shrink: 0;
  `,
  RowLabel: styled.span`
    font-size: 14px;
    color: var(--text);
    flex: 1;
    min-width: 0;
  `,
}
