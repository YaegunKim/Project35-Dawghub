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
  FieldRow: styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${spacing.sm};

    > * {
      flex: 1;
      min-width: 140px;
    }
  `,
  PhotoRow: styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${spacing.sm};
  `,
  PhotoThumb: styled.div`
    position: relative;
    width: 68px;
    height: 68px;
    border-radius: ${radius.md};
    overflow: hidden;
    background: ${surface.bg};
    border: 1px solid ${surface.border};
    box-shadow: ${shadow.sm};

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `,
  RemovePhotoButton: styled.button`
    position: absolute;
    top: 2px;
    right: 2px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: none;
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    font-size: 11px;
    line-height: 1;
    cursor: pointer;
  `,
  AddPhotoButton: styled.label<{ $color: string }>`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    width: 68px;
    height: 68px;
    border-radius: ${radius.md};
    border: 1.5px dashed ${({ $color }) => $color};
    color: ${({ $color }) => $color};
    background: ${({ $color }) => `${$color}0D`};
    font-size: 10px;
    font-weight: 600;
    text-align: center;
    cursor: pointer;

    input {
      display: none;
    }
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
  ChipRow: styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${spacing.xs};
  `,
  Chip: styled.button<{ $active: boolean; $color?: string }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
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
  ToggleRow: styled.label`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: ${surface.textMuted};
  `,
  Grid: styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;

    @media (min-width: 1024px) {
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    }
  `,
  ListingCard: styled(CardLink)<{ $color: string }>`
    display: flex;
    flex-direction: column;
    gap: 6px;
    position: relative;
    border-radius: ${radius.lg};
    border-top: 3px solid ${({ $color }) => $color};
    box-shadow: ${shadow.card};
    transition:
      transform ${motion.duration.fast} ${motion.easing.standard},
      box-shadow ${motion.duration.fast} ${motion.easing.standard};

    &:hover {
      box-shadow: ${shadow.hover};
    }
  `,
  PhotoWrap: styled.div`
    position: relative;
  `,
  ListingPhoto: styled.div<{ $color?: string }>`
    width: 100%;
    aspect-ratio: 4 / 3;
    border-radius: ${radius.sm};
    overflow: hidden;
    background: ${({ $color }) => ($color ? `${$color}14` : surface.bg)};
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${({ $color }) => $color ?? surface.textMuted};
    font-size: 28px;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `,
  SoldRibbon: styled.div`
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 3px 10px;
    border-radius: ${radius.pill};
    background: rgba(0, 0, 0, 0.75);
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    box-shadow: ${shadow.sm};
  `,
  ReservedRibbon: styled.div`
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 3px 10px;
    border-radius: ${radius.pill};
    background: #d97706;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    box-shadow: ${shadow.sm};
  `,
  ListingTitle: styled.h2`
    font-size: 14px;
    margin: 0;
    font-family: var(--font-display);
  `,
  ListingPrice: styled.p`
    font-size: 16px;
    font-weight: 800;
    margin: 0;
    color: ${brand.primary};
  `,
  ListingMeta: styled.div<{ $color: string }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    align-self: flex-start;
    padding: 3px 9px;
    border-radius: ${radius.pill};
    background: ${({ $color }) => `${$color}1A`};
    color: ${({ $color }) => $color};
    font-size: 11px;
    font-weight: 700;
  `,
}
