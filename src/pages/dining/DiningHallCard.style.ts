import styled from '@emotion/styled'
import { Card } from '../../design-system/Card/Card'

export const S = {
  Card: styled(Card)`
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
    background: var(--bg-elevated);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    cursor: pointer;
    transition:
      transform 0.1s ease,
      box-shadow 0.1s ease;

    &:active {
      transform: scale(0.98);
      box-shadow: none;
    }
  `,
  Header: styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  `,
  HeaderText: styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  `,
  HallName: styled.span`
    font-size: 16px;
    font-weight: 700;
  `,
  Hours: styled.span`
    font-size: 12px;
    color: var(--text-muted);
  `,
  NextOpen: styled.span`
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
  `,
  MenuRow: styled.div`
    display: flex;
    align-items: baseline;
    gap: 6px;
  `,
  MenuLabel: styled.span`
    font-size: 12px;
    font-weight: 600;
    color: var(--accent);
  `,
  MenuTime: styled.span`
    font-size: 11px;
    color: var(--text-muted);
  `,
  MenuHint: styled.span`
    font-size: 13px;
    color: var(--text-muted);
  `,
  Sections: styled.div`
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

    @media (min-width: 1024px) {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      overflow-x: visible;
      -webkit-mask-image: none;
      mask-image: none;
    }
  `,
  Section: styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 0 0 240px;
    min-width: 0;

    @media (min-width: 1024px) {
      flex: initial;
    }
  `,
  SectionTitle: styled.h3`
    margin: 0 2px;
    font-size: 11px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  `,
  ItemList: styled(Card.withComponent('ul'))`
    list-style: none;
    margin: 0;
    padding: 0;
    overflow: hidden;
    background: var(--bg);
  `,
  Item: styled.li`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 9px 12px;

    &:not(:last-child) {
      border-bottom: 1px solid var(--border);
    }
  `,
  ItemName: styled.span`
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
  `,
  ItemTags: styled.div`
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 4px;
    flex-shrink: 0;
  `,
  MoreHint: styled.li`
    padding: 8px 12px;
    font-size: 12px;
    color: var(--text-muted);
    text-align: center;
  `,
}
