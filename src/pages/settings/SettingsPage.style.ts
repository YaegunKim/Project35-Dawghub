import styled from '@emotion/styled'
import { radius } from '../../design-system/radius'
import { motion } from '../../design-system/motion'
import { state } from '../../design-system/colors'

export const S = {
  Section: styled.section`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  SectionTitle: styled.h2`
    margin: 0;
    padding: 0 4px;
    font-size: 13px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  `,
  Card: styled.div`
    display: flex;
    flex-direction: column;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: ${radius.md};
    overflow: hidden;
  `,
  Row: styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;

    &:not(:last-child) {
      border-bottom: 1px solid var(--border);
    }
  `,
  RowLabel: styled.span`
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  `,
  RowValue: styled.span`
    font-size: 14px;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  Segmented: styled.div`
    display: inline-flex;
    padding: 2px;
    background: var(--bg-elevated);
    border-radius: ${radius.pill};
    flex-shrink: 0;
  `,
  SegmentButton: styled.button<{ $active: boolean }>`
    padding: 6px 12px;
    border: none;
    border-radius: ${radius.pill};
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition:
      background-color ${motion.duration.fast} ${motion.easing.standard},
      color ${motion.duration.fast} ${motion.easing.standard};
    background: ${({ $active }) => ($active ? 'var(--accent)' : 'transparent')};
    color: ${({ $active }) => ($active ? 'var(--accent-contrast)' : 'var(--text-muted)')};
  `,
  AboutRow: styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px;
  `,
  VersionText: styled.span`
    font-size: 12px;
    color: var(--text-muted);
  `,
  SignOutButton: styled.button`
    align-self: flex-start;
    padding: 14px 16px;
    width: 100%;
    text-align: left;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: ${radius.md};
    color: ${state.danger};
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color ${motion.duration.fast} ${motion.easing.standard};

    &:active {
      background: var(--bg-elevated);
    }
  `,
}
