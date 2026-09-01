import styled from '@emotion/styled'
import { Card } from '../../design-system/Card/Card'
import { category, state } from '../../design-system/colors'
import { motion } from '../../design-system/motion'
import { radius } from '../../design-system/radius'
import { shadow } from '../../design-system/shadow'
import { spacing } from '../../design-system/spacing'

export const S = {
  Card: styled(Card)`
    display: flex;
    flex-direction: column;
    gap: ${spacing.md};
    min-width: 0;
    border-radius: ${radius.lg};
    background: var(--bg-elevated);
    box-shadow: ${shadow.md};
    cursor: pointer;
    transition:
      transform 0.1s ease,
      box-shadow 0.1s ease;

    &:active {
      transform: scale(0.98);
      box-shadow: ${shadow.sm};
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
    gap: 4px;
    min-width: 0;
  `,
  HallNameRow: styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  HallName: styled.span`
    font-size: 16px;
    font-weight: 700;
    line-height: 1.25;
  `,
  StatusBadge: styled.span<{ $open: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
    padding: 3px 9px 3px 7px;
    border-radius: ${radius.pill};
    background: ${({ $open }) => ($open ? state.successSoft : state.dangerSoft)};
    color: ${({ $open }) => ($open ? state.success : state.danger)};
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  `,
  StatusDot: styled.span<{ $open: boolean }>`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ $open }) => ($open ? state.success : state.danger)};
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
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    width: fit-content;
    padding: 4px 10px;
    border-radius: ${radius.pill};
    background: var(--bg);
  `,
  MenuLabel: styled.span`
    font-size: 12px;
    font-weight: 700;
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
  SectionHeader: styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0 2px;
  `,
  SectionDot: styled.span`
    width: 6px;
    height: 6px;
    flex-shrink: 0;
    border-radius: 50%;
    background: ${category.dining};
  `,
  SectionTitle: styled.h3`
    margin: 0;
    font-size: 11px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  `,
  PinIndicator: styled.span`
    display: inline-flex;
    flex-shrink: 0;
    font-size: 9px;
    color: var(--accent);
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
    padding: 10px 12px;

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
  ExpandableRegion: styled.div<{ $expanded: boolean }>`
    display: grid;
    grid-template-rows: ${({ $expanded }) => ($expanded ? '1fr' : '0fr')};
    transition: grid-template-rows ${motion.duration.slow} ${motion.easing.standard};
  `,
  ExpandableInner: styled.div`
    min-height: 0;
    overflow: hidden;
  `,
  ToggleRow: styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    padding: 8px;
    margin-top: -2px;
    border: none;
    border-top: 1px solid var(--border);
    background: none;
    color: var(--text-muted);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;

    &:active {
      opacity: 0.7;
    }
  `,
  ToggleChevron: styled.span<{ $expanded: boolean }>`
    display: inline-flex;
    font-size: 10px;
    transform: rotate(${({ $expanded }) => ($expanded ? '180deg' : '0deg')});
    transition: transform ${motion.duration.fast} ${motion.easing.standard};
  `,
}
