import styled from '@emotion/styled'

export const S = {
  Wrapper: styled.div`
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  `,
  Mark: styled.svg`
    flex-shrink: 0;
  `,
  Wordmark: styled.span`
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 20px;
    letter-spacing: 0.01em;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
}
