import styled from '@emotion/styled'

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
  Hours: styled.span`
    font-size: 12px;
    color: var(--text-muted);
  `,
}
