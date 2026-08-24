import styled from '@emotion/styled'

export const S = {
  Page: styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
    width: 100%;
    max-width: 720px;
    margin: 0 auto;

    @media (min-width: 1024px) {
      max-width: 960px;
    }
  `,
  PageTitle: styled.h1`
    font-family: var(--font-display);
    font-weight: 700;
    letter-spacing: 0.01em;
    font-size: 22px;
    margin: 0;
  `,
}
