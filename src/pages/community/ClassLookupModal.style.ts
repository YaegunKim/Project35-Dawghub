import styled from '@emotion/styled'
import { Link } from 'react-router-dom'
import { spacing } from '../../design-system/spacing'
import { category } from '../../design-system/colors'

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
  `,
  SectionRow: styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 0;
    border-bottom: 1px solid var(--border);

    &:last-child {
      border-bottom: none;
    }
  `,
  SectionMeta: styled.div`
    font-size: 13px;
    color: var(--text);
  `,
  InstructorRow: styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-muted);
  `,
  RatingBadge: styled.span`
    font-weight: 700;
    color: ${category.courses[1]};
  `,
  CatalogRow: styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
  `,
  CatalogLabel: styled.span`
    font-size: 11px;
    font-weight: 700;
    color: var(--text-muted);
  `,
  CatalogValue: styled.p`
    margin: 0;
    font-size: 13px;
    color: var(--text);
    white-space: pre-wrap;
  `,
  ScheduleLink: styled(Link)`
    align-self: flex-start;
    font-size: 13px;
    font-weight: 600;
    color: var(--accent);
  `,
}
