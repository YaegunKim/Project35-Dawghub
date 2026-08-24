import styled from '@emotion/styled'
import { CardLink } from '../../design-system/Card/Card'

export const S = {
  BoardList: styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  BoardCard: styled(CardLink)`
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--bg-elevated);
    font-size: 15px;
    font-weight: 600;
  `,
  BoardIcon: styled.span`
    font-size: 20px;
  `,
}
