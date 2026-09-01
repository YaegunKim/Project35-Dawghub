import styled from '@emotion/styled'

export const S = {
  TitleRow: styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  `,
  TitleGroup: styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  `,
  TodayDate: styled.span`
    font-size: 13px;
    color: var(--text-muted);
  `,
  HallList: styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  `,
}
