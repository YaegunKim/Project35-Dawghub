import styled from '@emotion/styled'

export const S = {
  Wrapper: styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
    max-width: 260px;
    overflow-wrap: break-word;
  `,
  ViewLink: styled.a`
    align-self: flex-start;
    font-size: 12px;
    font-weight: 600;
    color: var(--accent);
  `,
  MenuScroll: styled.div`
    display: flex;
    gap: 8px;
    min-width: 0;
    overflow-x: auto;
    padding-bottom: 2px;
    scrollbar-width: none;
    -webkit-mask-image: linear-gradient(to right, black calc(100% - 20px), transparent 100%);
    mask-image: linear-gradient(to right, black calc(100% - 20px), transparent 100%);

    &::-webkit-scrollbar {
      display: none;
    }
  `,
  MenuPill: styled.span`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    padding: 6px 12px;
    border-radius: 999px;
    background: var(--bg);
    border: 1px solid var(--border);
    font-size: 13px;
    white-space: nowrap;
  `,
}
