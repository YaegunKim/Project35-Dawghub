import styled from '@emotion/styled'
import { brand } from '../../design-system/colors'
import { radius } from '../../design-system/radius'
import { shadow } from '../../design-system/shadow'

export const S = {
  TitleRow: styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  `,
  TitleGroup: styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  `,
  TodayDate: styled.span`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
    padding: 5px 12px;
    border-radius: ${radius.pill};
    background: ${brand.white};
    color: ${brand.black};
    font-size: 12px;
    font-weight: 700;
    box-shadow: ${shadow.sm};
  `,
  HallList: styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  `,
}
