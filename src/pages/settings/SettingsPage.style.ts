import styled from '@emotion/styled'
import { radius } from '../../design-system/radius'
import { motion } from '../../design-system/motion'
import { state } from '../../design-system/colors'

export const S = {
  Section: styled.section`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  SectionTitle: styled.h2`
    margin: 0;
    padding: 0 4px;
    font-size: 13px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  `,
  Card: styled.div`
    display: flex;
    flex-direction: column;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: ${radius.md};
    overflow: hidden;
  `,
  Row: styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;

    &:not(:last-child) {
      border-bottom: 1px solid var(--border);
    }
  `,
  RowLabel: styled.span`
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  `,
  RowValue: styled.span`
    font-size: 14px;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  AboutRow: styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px;
  `,
  VersionText: styled.span`
    font-size: 12px;
    color: var(--text-muted);
  `,
  DebugToggleRow: styled.button`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;
    border: none;
    background: none;
    color: var(--text);
    font: inherit;
    text-align: left;
    cursor: pointer;
  `,
  DebugBody: styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    border-top: 1px solid var(--border);
  `,
  DebugEmpty: styled.div`
    padding: 14px 16px;
    font-size: 13px;
    color: var(--text-muted);
  `,
  DebugStatGrid: styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    padding: 16px;
  `,
  DebugStat: styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  `,
  DebugStatValue: styled.span`
    font-size: 20px;
    font-weight: 700;
  `,
  DebugStatLabel: styled.span`
    font-size: 11px;
    color: var(--text-muted);
    text-align: center;
  `,
  DebugRouteTable: styled.div`
    display: flex;
    flex-direction: column;
    max-height: 240px;
    overflow-y: auto;
    border-top: 1px solid var(--border);
  `,
  DebugRouteRow: styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 16px;
    font-size: 13px;

    &:not(:last-child) {
      border-bottom: 1px solid var(--border);
    }

    span:last-child {
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
    }
  `,
  DebugDataAgeNote: styled.div`
    padding: 0 16px;
    font-size: 12px;
    color: var(--text-muted);
  `,
  DebugRouteSelectRow: styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 16px;
  `,
  DebugScheduleScroll: styled.div`
    overflow-x: auto;
    border-top: 1px solid var(--border);
  `,
  DebugScheduleGrid: styled.div`
    display: grid;
    grid-template-columns: minmax(140px, 1.5fr) repeat(7, minmax(52px, 1fr));
    width: max-content;
    min-width: 100%;
  `,
  DebugScheduleHeaderCell: styled.div`
    padding: 8px 6px;
    font-size: 11px;
    font-weight: 700;
    color: var(--text-muted);
    text-align: center;
    border-bottom: 1px solid var(--border);

    &:first-of-type {
      text-align: left;
      padding-left: 16px;
    }
  `,
  DebugScheduleStopCell: styled.div`
    padding: 8px 6px 8px 16px;
    font-size: 12px;
    border-bottom: 1px solid var(--border);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  DebugScheduleTimeCell: styled.div`
    padding: 8px 6px;
    font-size: 11px;
    text-align: center;
    font-variant-numeric: tabular-nums;
    color: var(--text-muted);
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  `,
  DebugSegmentList: styled.div`
    display: flex;
    flex-direction: column;
    padding: 4px 16px 12px;
  `,
  DebugSegmentRow: styled.div`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    padding: 6px 0;
    font-size: 12px;

    &:not(:last-child) {
      border-bottom: 1px solid var(--border);
    }
  `,
  DebugSegmentLabel: styled.span`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  DebugSegmentValue: styled.span`
    flex-shrink: 0;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  `,
  DebugRefreshButton: styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin: 12px 16px 16px;
    padding: 10px;
    border: 1px solid var(--border);
    border-radius: ${radius.md};
    background: var(--bg);
    color: var(--text);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity ${motion.duration.fast} ${motion.easing.standard};

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `,
  SignOutButton: styled.button`
    align-self: flex-start;
    padding: 14px 16px;
    width: 100%;
    text-align: left;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: ${radius.md};
    color: ${state.danger};
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color ${motion.duration.fast} ${motion.easing.standard};

    &:active {
      background: var(--bg-elevated);
    }
  `,
}
