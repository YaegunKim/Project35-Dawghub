import styled from '@emotion/styled'
import { keyframes } from '@emotion/react'
import { Card } from '../../design-system/Card/Card'
import { Button } from '../../design-system/Button/Button'
import { brand, state } from '../../design-system/colors'

const modalIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.94) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
`

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`

export const S = {
  Root: styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
  `,
  Padded: styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
    padding: 16px;

    @media (min-width: 768px) {
      padding: 32px;
    }
  `,
  Form: styled.form`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  Row: styled.div`
    display: flex;
    gap: 8px;

    > * {
      flex: 1;
    }
  `,
  GridWrap: styled.div`
    width: 100%;
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    background: var(--bg-elevated);
  `,
  Grid: styled.div`
    display: grid;
    grid-template-columns: 28px repeat(7, minmax(0, 1fr));
    width: 100%;

    @media (min-width: 480px) {
      grid-template-columns: 40px repeat(7, minmax(0, 1fr));
    }
  `,
  CornerCell: styled.div`
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--bg-elevated);
    border-bottom: 1px solid var(--border);
  `,
  DayHeader: styled.div`
    position: sticky;
    top: 0;
    z-index: 1;
    padding: 6px 1px;
    text-align: center;
    font-size: 10px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.01em;
    background: var(--bg-elevated);
    border-bottom: 1px solid var(--border);
    border-left: 1px solid var(--border);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    @media (min-width: 480px) {
      padding: 8px 4px;
      font-size: 12px;
      letter-spacing: 0.04em;
    }
  `,
  TimeAxis: styled.div`
    position: relative;
  `,
  HourLabel: styled.span`
    position: absolute;
    right: 3px;
    transform: translateY(-50%);
    font-size: 9px;
    color: var(--text-muted);
    white-space: nowrap;

    @media (min-width: 480px) {
      right: 6px;
      font-size: 11px;
    }
  `,
  DayColumn: styled.div`
    position: relative;
    border-left: 1px solid var(--border);
  `,
  HourLine: styled.div`
    position: absolute;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--border);
    opacity: 0.6;
  `,
  Block: styled.div`
    position: absolute;
    display: flex;
    flex-direction: column;
    gap: 1px;
    border-radius: 6px;
    border-left: 3px solid rgba(255, 255, 255, 0.55);
    padding: 2px 4px;
    color: ${brand.white};
    font-size: 9px;
    line-height: 1.3;
    overflow: hidden;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    transition:
      transform 0.1s ease,
      box-shadow 0.1s ease;

    @media (min-width: 480px) {
      gap: 2px;
      border-radius: 8px;
      padding: 5px 8px;
      font-size: 11px;
      line-height: 1.35;
    }

    &:hover {
      transform: scale(1.02);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      z-index: 2;
    }
  `,
  BlockCourse: styled.div`
    font-weight: 700;
    letter-spacing: 0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  BlockTime: styled.div`
    opacity: 0.95;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  BlockLocation: styled.div`
    opacity: 0.85;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  ModalBackdrop: styled.div`
    position: fixed;
    inset: 0;
    z-index: 30;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: rgba(0, 0, 0, 0.5);
    animation: ${fadeIn} 0.15s ease;
  `,
  Detail: styled(Card)`
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 400px;
    max-height: 80vh;
    padding: 0;
    border-radius: 20px;
    overflow: hidden;
    background: var(--bg);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
    animation: ${modalIn} 0.18s cubic-bezier(0.2, 0.9, 0.3, 1);
  `,
  DetailAccent: styled.div`
    height: 6px;
    flex-shrink: 0;
  `,
  DetailBody: styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px;
    overflow-y: auto;
  `,
  SearchBackdrop: styled.div`
    position: fixed;
    inset: 0;
    z-index: 30;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: rgba(0, 0, 0, 0.5);
    animation: ${fadeIn} 0.15s ease;
  `,
  SearchPanel: styled(Card)`
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 420px;
    max-height: 85vh;
    padding: 0;
    border-radius: 20px;
    overflow: hidden;
    background: var(--bg);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
    animation: ${modalIn} 0.18s cubic-bezier(0.2, 0.9, 0.3, 1);

    @media (min-width: 768px) {
      max-width: 520px;
    }
  `,
  SearchPanelHeader: styled.form`
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex-shrink: 0;
    padding: 16px;
    border-bottom: 1px solid var(--border);

    @media (min-width: 768px) {
      padding: 20px;
    }
  `,
  SearchPanelBody: styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex: 1;
    min-height: 0;
    padding: 16px;
    overflow-y: auto;

    @media (min-width: 768px) {
      padding: 20px;
    }
  `,
  CoursePill: styled.span`
    display: inline-flex;
    align-self: flex-start;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
  `,
  MeetingList: styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
  `,
  MeetingRow: styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 12px;
    border-radius: 10px;
    background: var(--bg);
    font-size: 13px;
    color: var(--text);
  `,
  MeetingTopRow: styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
  `,
  MeetingTime: styled.div`
    font-weight: 600;
  `,
  MeetingLocationText: styled.div`
    color: var(--text-muted);
    font-size: 12px;
  `,
  DayChip: styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 22px;
    padding: 0 4px;
    border-radius: 999px;
    background: var(--border);
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 800;
    flex-shrink: 0;
  `,
  SectionChip: styled.span`
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--border);
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 700;
    flex-shrink: 0;
  `,
  DangerButton: styled(Button)`
    background: transparent;
    color: ${state.danger};
    border-color: ${state.danger};

    &:hover {
      background: ${state.dangerSoft};
    }
  `,
  RatingBadge: styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 36px;
    height: 28px;
    padding: 0 8px;
    border-radius: 999px;
    color: ${brand.white};
    font-size: 13px;
    font-weight: 800;
    flex-shrink: 0;
  `,
  ProfessorButton: styled.span`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    align-self: flex-start;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  `,
  ReviewList: styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  ReviewCard: styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 12px;
    border-radius: 10px;
    background: var(--bg-elevated);
  `,
  ReviewComment: styled.p`
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: var(--text);
    overflow-wrap: break-word;
  `,
  SectionList: styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  `,
  SectionCard: styled(Card)`
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
    padding: 14px 16px;
    border-radius: 14px;
  `,
  SectionInfo: styled.div`
    display: flex;
    flex-direction: column;
    min-width: 0;
  `,
  RatingRow: styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  `,
  OptionGroup: styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 4px;

    @media (min-width: 768px) {
      flex-direction: row;
      align-items: stretch;
      justify-content: center;
      gap: 20px;
      padding-top: 20px;
      position: relative;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 10%;
        right: 10%;
        height: 1px;
        background: var(--border);
      }
    }
  `,
  OptionBranch: styled.div`
    min-width: 0;

    @media (min-width: 768px) {
      position: relative;
      flex: 1;
      display: flex;
      justify-content: center;
      padding-top: 20px;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 50%;
        width: 1px;
        height: 20px;
        background: var(--border);
      }
    }
  `,
  OptionCard: styled.button<{ $selected: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
    min-width: 0;
    padding: 10px 12px;
    border-radius: 12px;
    border: 2px solid ${({ $selected }) => ($selected ? 'var(--accent)' : 'var(--border)')};
    background: ${({ $selected }) => ($selected ? 'var(--bg-elevated)' : 'var(--bg)')};
    color: var(--text);
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition:
      border-color 0.15s ease,
      background-color 0.15s ease;

    @media (min-width: 768px) {
      max-width: 220px;
    }
  `,
  PanelHeader: styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-width: 0;
  `,
  DetailCourse: styled.span`
    font-size: 16px;
    font-weight: 700;
    overflow-wrap: break-word;
  `,
  DetailSub: styled.span`
    font-size: 13px;
    color: var(--text-muted);
    overflow-wrap: break-word;
  `,
  FabBackdrop: styled.div`
    position: fixed;
    inset: 0;
    z-index: 20;
  `,
  FabWrap: styled.div`
    position: fixed;
    right: 20px;
    bottom: calc(64px + env(safe-area-inset-bottom) + 20px);
    z-index: 21;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 10px;

    @media (min-width: 768px) {
      bottom: 24px;
    }
  `,
  FabMenu: styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--bg-elevated);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.16);
  `,
  FabMenuItem: styled.button`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--text);
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
    text-align: left;

    &:hover {
      background: var(--bg);
    }
  `,
  Fab: styled.button`
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: none;
    background: var(--accent);
    color: var(--accent-contrast);
    font-size: 26px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    transition: transform 0.1s ease;

    &:hover {
      transform: scale(1.05);
    }
  `,
}
