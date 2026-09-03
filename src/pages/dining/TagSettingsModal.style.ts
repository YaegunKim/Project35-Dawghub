import styled from '@emotion/styled'
import { spacing } from '../../design-system/spacing'

export const S = {
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
}
