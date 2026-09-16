import styled from '@emotion/styled'
import { Card } from '../../design-system/Card/Card'
import { state, brand, surface } from '../../design-system/colors'
import { radius } from '../../design-system/radius'
import { shadow } from '../../design-system/shadow'
import { spacing } from '../../design-system/spacing'

export const S = {
  DetailCard: styled(Card)<{ $color: string }>`
    display: flex;
    flex-direction: column;
    gap: ${spacing.sm};
    border-radius: ${radius.lg};
    border-top: 3px solid ${({ $color }) => $color};
    box-shadow: ${shadow.card};
  `,
  PhotoStrip: styled.div`
    display: flex;
    gap: ${spacing.sm};
    overflow-x: auto;
    scroll-snap-type: x mandatory;

    img {
      flex: 0 0 auto;
      width: 260px;
      aspect-ratio: 4 / 3;
      object-fit: cover;
      border-radius: ${radius.md};
      box-shadow: ${shadow.sm};
      scroll-snap-align: start;
    }
  `,
  NoPhoto: styled.div<{ $color: string }>`
    width: 100%;
    aspect-ratio: 16 / 9;
    border-radius: ${radius.md};
    background: ${({ $color }) => `${$color}14`};
    color: ${({ $color }) => $color};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40px;
  `,
  Title: styled.h1`
    font-size: 19px;
    font-family: var(--font-display);
    margin: 0;
  `,
  Price: styled.p`
    font-size: 22px;
    font-weight: 800;
    color: ${brand.primary};
    margin: 0;
  `,
  MetaRow: styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  `,
  MetaChip: styled.span<{ $color?: string }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 11px;
    border-radius: ${radius.pill};
    background: ${({ $color }) => ($color ? `${$color}1A` : surface.bg)};
    border: 1px solid ${({ $color }) => $color ?? surface.border};
    font-size: 12px;
    font-weight: 600;
    color: ${({ $color }) => $color ?? surface.textMuted};
  `,
  Description: styled.p`
    font-size: 14px;
    white-space: pre-wrap;
    margin: 0;
    line-height: 1.5;
  `,
  ActionRow: styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${spacing.sm};
    padding-top: ${spacing.xs};
    border-top: 1px solid ${surface.border};
  `,
  ContactReveal: styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-radius: ${radius.md};
    background: ${surface.bg};
    font-size: 14px;

    a {
      color: ${brand.primary};
      font-weight: 700;
    }
  `,
  ErrorActions: styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  `,
  FieldError: styled.p`
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: ${state.danger};
  `,
}
