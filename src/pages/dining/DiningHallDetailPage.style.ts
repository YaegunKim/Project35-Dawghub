import styled from '@emotion/styled'
import { Card } from '../../design-system/Card/Card'
import { shadow } from '../../design-system/shadow'
import { zIndex } from '../../design-system/zIndex'

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
  HoursNote: styled.p`
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
    opacity: 0.8;
  `,
  MealTabs: styled.div`
    position: sticky;
    top: 0;
    z-index: ${zIndex.raised};
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
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 2px;
    padding: 8px 4px;
    border: none;
    border-radius: 8px;
    text-align: center;
    cursor: pointer;
    transition:
      background-color 0.15s ease,
      color 0.15s ease,
      box-shadow 0.15s ease;
    background: ${({ $active }) => ($active ? 'var(--bg)' : 'transparent')};
    color: ${({ $active }) => ($active ? 'var(--text)' : 'var(--text-muted)')};
    box-shadow: ${({ $active }) => ($active ? shadow.tabActive : 'none')};
  `,
  MealTabLabel: styled.span`
    display: block;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  MealTabHours: styled.span<{ $active: boolean }>`
    display: block;
    font-size: 10px;
    font-weight: 500;
    line-height: 1.2;
    color: var(--text-muted);
    opacity: ${({ $active }) => ($active ? 1 : 0.7)};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  MealTabNote: styled.span<{ $active: boolean }>`
    display: block;
    font-size: 9px;
    font-weight: 500;
    line-height: 1.2;
    color: var(--text-muted);
    opacity: ${({ $active }) => ($active ? 0.85 : 0.6)};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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
  SectionHeader: styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  `,
  SectionTitle: styled.h2`
    margin: 0 2px;
    font-size: 12px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  `,
  PinButton: styled.button<{ $pinned: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    flex-shrink: 0;
    border: none;
    background: none;
    border-radius: 999px;
    font-size: 12px;
    color: ${({ $pinned }) => ($pinned ? 'var(--accent)' : 'var(--text-muted)')};
    opacity: ${({ $pinned }) => ($pinned ? 1 : 0.5)};
    cursor: pointer;
    transition:
      color 0.15s ease,
      opacity 0.15s ease,
      transform 0.15s ease;

    &:active {
      transform: scale(0.9);
    }
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
