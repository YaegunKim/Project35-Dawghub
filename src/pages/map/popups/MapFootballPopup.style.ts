import styled from '@emotion/styled'
import { brand, state } from '../../../design-system/colors'
import { spacing } from '../../../design-system/spacing'
import { radius } from '../../../design-system/radius'

export const S = {
  Wrapper: styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    max-width: 240px;
    overflow-wrap: break-word;
  `,
  Name: styled.span`
    font-size: 14px;
    font-weight: 700;
  `,
  Sub: styled.span`
    font-size: 12px;
    color: var(--text-muted);
  `,
  Opponent: styled.span`
    font-size: 13px;
    font-weight: 600;
  `,
  LiveRow: styled.div`
    display: flex;
    align-items: center;
    gap: ${spacing.xs};
    flex-wrap: wrap;
  `,
  LiveBadge: styled.span`
    background: ${state.danger};
    color: ${state.dangerContrast};
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: ${radius.pill};
  `,
  Score: styled.span`
    font-size: 13px;
    font-weight: 700;
    color: ${brand.primary};
  `,
}
