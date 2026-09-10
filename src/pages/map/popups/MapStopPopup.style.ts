import styled from '@emotion/styled'

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
  RouteList: styled.ul`
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  `,
  RouteRow: styled.li`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
  `,
  RouteBadge: styled.span<{ $color: string }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    border-radius: 50%;
    background: ${({ $color }) => $color};
    color: white;
    font-size: 9px;
    font-weight: 700;
  `,
  RouteName: styled.span`
    flex: 1;
    min-width: 0;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  Eta: styled.span<{ $running: boolean }>`
    flex-shrink: 0;
    font-weight: 600;
    color: ${({ $running }) => ($running ? 'var(--accent)' : 'var(--text-muted)')};
  `,
  Empty: styled.div`
    font-size: 13px;
    color: var(--text-muted);
  `,
  EstimateNote: styled.div`
    font-size: 11px;
    color: var(--text-muted);
    font-style: italic;
  `,
}
