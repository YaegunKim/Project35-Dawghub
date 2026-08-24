import styled from '@emotion/styled'
import { category } from '../../../design-system/colors'

export const S = {
  Wrapper: styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
    max-width: 240px;
    overflow-wrap: break-word;
  `,
  Name: styled.div`
    font-size: 14px;
    font-weight: 700;
    color: var(--text);
  `,
  Button: styled.button<{ $active: boolean }>`
    align-self: flex-start;
    font-size: 12px;
    font-weight: 600;
    padding: 6px 10px;
    border-radius: 6px;
    border: 1px solid ${({ $active }) => ($active ? category.myDorm.fill : 'var(--border)')};
    background: ${({ $active }) => ($active ? category.myDorm.bg : 'transparent')};
    color: ${({ $active }) => ($active ? category.myDorm.text : 'var(--text)')};
    cursor: pointer;
  `,
}
