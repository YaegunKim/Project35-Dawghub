import styled from '@emotion/styled'
import { radius } from '../radius'

const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 4.5L6 8l3.5-3.5' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")"

export const S = {
  Select: styled.select`
    width: 100%;
    min-width: 0;
    padding: 10px 30px 10px 12px;
    border-radius: ${radius.sm};
    border: 1px solid var(--border);
    background-color: var(--bg);
    background-image: ${CHEVRON};
    background-repeat: no-repeat;
    background-position: right 10px center;
    background-size: 12px;
    color: var(--text);
    font-size: 14px;
    appearance: none;
    cursor: pointer;
    text-overflow: ellipsis;
  `,
}
