import styled from '@emotion/styled'
import { CardLink, Card } from '../../design-system/Card/Card'
import { surface, brand } from '../../design-system/colors'
import { radius } from '../../design-system/radius'
import { shadow } from '../../design-system/shadow'
import { spacing } from '../../design-system/spacing'
import { motion } from '../../design-system/motion'

export const S = {
  Banner: styled(Card)`
    display: flex;
    align-items: center;
    gap: ${spacing.md};
    border: none;
    background: linear-gradient(135deg, var(--bg-elevated), var(--bg));
    box-shadow: ${shadow.sm};
  `,
  BannerText: styled.p`
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: ${surface.text};
  `,
  BoardGrid: styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;

    @media (min-width: 1024px) {
      gap: 16px;
    }
  `,
  BoardTile: styled(CardLink)<{ $color: string }>`
    min-width: 0;
    aspect-ratio: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: ${spacing.md};
    text-align: center;
    background: ${({ $color }) => `${$color}0F`};
    border: 1px solid ${({ $color }) => `${$color}33`};
    border-radius: ${radius.lg};
    box-shadow: ${shadow.card};
    transition:
      transform ${motion.duration.fast} ${motion.easing.standard},
      box-shadow ${motion.duration.fast} ${motion.easing.standard};

    &:hover {
      box-shadow: ${shadow.hover};
      transform: translateY(-2px);
    }

    &:active {
      transform: scale(0.96);
      box-shadow: ${shadow.sm};
    }

    @media (min-width: 1024px) {
      gap: 12px;
      padding: ${spacing.xl};
    }
  `,
  TileIcon: styled.span<{ $color: string }>`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 52px;
    border-radius: ${radius.md};
    background: ${({ $color }) => $color};
    color: ${brand.white};
    font-size: 22px;
    box-shadow: ${shadow.sm};

    @media (min-width: 1024px) {
      width: 76px;
      height: 76px;
      border-radius: ${radius.lg};
      font-size: 32px;
    }
  `,
  TileLabel: styled.span`
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 700;
    color: ${surface.text};
    line-height: 1.15;

    @media (min-width: 1024px) {
      font-size: 20px;
    }
  `,
  TileSubtitle: styled.span`
    min-width: 0;
    max-width: 100%;
    font-size: 11px;
    color: ${surface.textMuted};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    @media (min-width: 1024px) {
      font-size: 14px;
      white-space: normal;
      line-height: 1.3;
    }
  `,
}
