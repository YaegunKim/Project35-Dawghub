import styled from '@emotion/styled'
import { Card, CardLink } from '../../design-system/Card/Card'
import { state, brand, surface } from '../../design-system/colors'
import { radius } from '../../design-system/radius'
import { shadow } from '../../design-system/shadow'
import { spacing } from '../../design-system/spacing'
import { motion } from '../../design-system/motion'

export const S = {
  TitleRow: styled.div`
    display: flex;
    align-items: center;
    gap: ${spacing.sm};

    h1 {
      margin: 0;
    }
  `,
  TitleIconBadge: styled.span<{ $color: string }>`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: ${radius.md};
    background: ${({ $color }) => `${$color}1F`};
    color: ${({ $color }) => $color};
    font-size: 15px;
  `,
  SkeletonCard: styled(Card)`
    display: flex;
    flex-direction: column;
    gap: 8px;
    box-shadow: ${shadow.card};
  `,
  Form: styled.form<{ $color: string }>`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: ${spacing.base};
    border-radius: ${radius.lg};
    border: 1px solid ${surface.border};
    border-top: 3px solid ${({ $color }) => $color};
    background: ${surface.bgElevated};
    box-shadow: ${shadow.card};
  `,
  FormHeading: styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: ${surface.textMuted};
  `,
  FieldError: styled.p`
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: ${state.danger};
  `,
  ErrorActions: styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  `,
  PostList: styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
  `,
  PostCardRow: styled.div`
    display: flex;
    align-items: stretch;
    gap: 6px;
  `,
  PostCard: styled(CardLink)<{ $color: string }>`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    border-radius: ${radius.lg};
    border-left: 3px solid ${({ $color }) => $color};
    box-shadow: ${shadow.card};
    transition:
      transform ${motion.duration.fast} ${motion.easing.standard},
      box-shadow ${motion.duration.fast} ${motion.easing.standard};

    &:hover {
      box-shadow: ${shadow.hover};
    }
  `,
  PostTitle: styled.h2`
    font-size: 15px;
    margin: 0;
    font-family: var(--font-display);
  `,
  PostBody: styled.p`
    font-size: 14px;
    color: ${surface.textMuted};
    margin: 0;
    white-space: pre-wrap;
  `,
  PostMetaRow: styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 4px;
  `,
  MetaChip: styled.span<{ $dot?: string }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 9px;
    border-radius: ${radius.pill};
    background: ${surface.bg};
    border: 1px solid ${surface.border};
    font-size: 11px;
    color: ${surface.textMuted};

    ${({ $dot }) =>
      $dot &&
      `
      &::before {
        content: '';
        width: 6px;
        height: 6px;
        flex-shrink: 0;
        border-radius: 1px;
        background: ${$dot};
      }
    `}
  `,
  CourseChip: styled.button<{ $color: string }>`
    display: inline-flex;
    align-items: center;
    padding: 3px 9px;
    border-radius: ${radius.pill};
    border: 1px solid ${({ $color }) => $color};
    background: ${({ $color }) => `${$color}14`};
    color: ${({ $color }) => $color};
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
  `,
  ScrapButton: styled.button<{ $active: boolean }>`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 16px;
    color: ${(props) => (props.$active ? brand.primary : surface.textMuted)};

    &:active {
      opacity: 0.7;
    }
  `,
  FieldLabel: styled.label`
    font-size: 12px;
    font-weight: 600;
    color: ${surface.textMuted};
  `,
  FieldRow: styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${spacing.sm};

    > div {
      flex: 1;
      min-width: 120px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
  `,
  ChipRow: styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${spacing.xs};
  `,
  Chip: styled.button<{ $active: boolean; $color?: string }>`
    padding: 7px 14px;
    border-radius: ${radius.pill};
    border: 1px solid ${(props) => (props.$active ? (props.$color ?? brand.primary) : surface.border)};
    background: ${(props) => (props.$active ? `${props.$color ?? brand.primary}1A` : surface.bgElevated)};
    color: ${(props) => (props.$active ? (props.$color ?? brand.primary) : surface.text)};
    box-shadow: ${(props) => (props.$active ? 'none' : shadow.sm)};
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition:
      background-color ${motion.duration.fast} ${motion.easing.standard},
      border-color ${motion.duration.fast} ${motion.easing.standard};
  `,
  ExternalLinkRow: styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${spacing.sm};
  `,
  ExternalLinkButton: styled.button<{ $color: string }>`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 16px;
    border-radius: ${radius.pill};
    border: 1px solid ${({ $color }) => $color};
    background: ${({ $color }) => `${$color}14`};
    color: ${({ $color }) => $color};
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: ${shadow.sm};
    transition: transform ${motion.duration.fast} ${motion.easing.standard};

    &:active {
      transform: scale(0.97);
    }
  `,
  ExternalNotice: styled.p`
    margin: 0;
    font-size: 12px;
    color: ${surface.textMuted};
    flex-basis: 100%;
  `,
  CalendarStrip: styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${spacing.md};
    padding: ${spacing.sm} ${spacing.md};
    border-radius: ${radius.md};
    background: ${surface.bgElevated};
    box-shadow: ${shadow.sm};
    font-size: 12px;
    color: ${surface.textMuted};
  `,
}
