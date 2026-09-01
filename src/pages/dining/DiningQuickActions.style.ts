import styled from '@emotion/styled'
import { radius } from '../../design-system/radius'

export const S = {
  Row: styled.div`
    display: flex;
    gap: 8px;
  `,
  ActionButton: styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: ${radius.pill};
    border: 1px solid var(--accent);
    background: transparent;
    color: var(--accent);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;

    &:active {
      opacity: 0.7;
    }
  `,
}
