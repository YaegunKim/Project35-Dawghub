import styled from '@emotion/styled'
import { category } from '../../../design-system/colors'

export const S = {
  Wrapper: styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    max-width: 240px;
    overflow-wrap: break-word;
  `,
  Name: styled.div`
    font-size: 14px;
    font-weight: 700;
    color: var(--text);
  `,
  Empty: styled.div`
    font-size: 12px;
    color: var(--text-muted);
  `,
  ClassList: styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
  `,
  ClassRow: styled.div`
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-size: 12px;
  `,
  CourseCode: styled.span`
    font-weight: 700;
    color: ${category.myAcademic.fill};
  `,
  ClassTime: styled.span`
    color: var(--text-muted);
  `,
}
