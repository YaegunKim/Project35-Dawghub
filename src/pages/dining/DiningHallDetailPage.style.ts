import styled from '@emotion/styled'
import { Card } from '../../design-system/Card/Card'

export const S = {
  Header: styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
  `,
  HoursToday: styled.p`
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
  `,
  MealTabs: styled.div`
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    gap: 2px;
    padding: 3px;
    margin-top: 4px;
    border-radius: 11px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
  `,
  MealTab: styled.button<{ $active: boolean }>`
    flex: 1;
    padding: 9px 0;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition:
      background-color 0.15s ease,
      color 0.15s ease,
      box-shadow 0.15s ease;
    background: ${({ $active }) => ($active ? 'var(--bg)' : 'transparent')};
    color: ${({ $active }) => ($active ? 'var(--text)' : 'var(--text-muted)')};
    box-shadow: ${({ $active }) => ($active ? '0 1px 3px rgba(0, 0, 0, 0.12)' : 'none')};
  `,
  Sections: styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
  `,
  Section: styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
  `,
  SectionTitle: styled.h2`
    margin: 0 2px;
    font-size: 12px;
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
  `,
  Item: styled.li`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 12px 14px;

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
    gap: 6px;
    flex-shrink: 0;
  `,
}
