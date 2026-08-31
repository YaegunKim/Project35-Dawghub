import styled from '@emotion/styled'
import { keyframes } from '@emotion/react'
import { brand, state } from '../../design-system/colors'
import { radius } from '../../design-system/radius'
import { spacing } from '../../design-system/spacing'
import { motion } from '../../design-system/motion'
import type { TagFilterState } from './tagFilters'

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
  HeaderActions: styled.div`
    display: flex;
    align-items: center;
    gap: ${spacing.sm};
  `,
  ResetButton: styled.button`
    border: none;
    background: none;
    padding: 0;
    font-size: 12px;
    font-weight: 600;
    color: var(--accent);
    cursor: pointer;

    &:active {
      opacity: 0.7;
    }
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
  Row: styled.div`
    display: flex;
    align-items: center;
    gap: ${spacing.sm};
    padding: 6px 4px;
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
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  SegmentedGroup: styled.div`
    display: flex;
    flex-shrink: 0;
    border-radius: ${radius.pill};
    overflow: hidden;
    border: 1px solid var(--border);
  `,
  Segment: styled.button<{ $active: boolean; $variant: TagFilterState }>`
    padding: 6px 8px;
    border: none;
    border-left: 1px solid var(--border);
    font-size: 10px;
    font-weight: 700;
    white-space: nowrap;
    cursor: pointer;
    transition:
      background-color ${motion.duration.fast} ${motion.easing.standard},
      color ${motion.duration.fast} ${motion.easing.standard};

    &:first-of-type {
      border-left: none;
    }

    &:active {
      opacity: 0.8;
    }

    background: ${({ $active, $variant }) => {
      if (!$active) return 'var(--bg-elevated)'
      if ($variant === 'only') return 'var(--accent)'
      if ($variant === 'exclude') return state.danger
      return 'var(--border)'
    }};
    color: ${({ $active, $variant }) => {
      if (!$active) return 'var(--text-muted)'
      if ($variant === 'only') return 'var(--accent-contrast)'
      if ($variant === 'exclude') return brand.white
      return 'var(--text)'
    }};
  `,
}
