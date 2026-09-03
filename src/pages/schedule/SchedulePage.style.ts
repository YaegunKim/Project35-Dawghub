import styled from '@emotion/styled'
import { Card } from '../../design-system/Card/Card'
import { brand } from '../../design-system/colors'
import { motion } from '../../design-system/motion'
import { radius } from '../../design-system/radius'
import { shadow } from '../../design-system/shadow'
import { zIndex } from '../../design-system/zIndex'

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
  TitleRow: styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  `,
  LocationRow: styled.div`
    display: flex;
    align-items: center;
    gap: 8px;

    > input {
      flex: 1;
      min-width: 0;
    }

    > button {
      flex-shrink: 0;
    }
  `,
  LocationPickedNote: styled.div`
    font-size: 12px;
    color: var(--text-muted);
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
    z-index: ${zIndex.raised};
    background: var(--bg-elevated);
    border-bottom: 1px solid var(--border);
  `,
  DayHeader: styled.div`
    position: sticky;
    top: 0;
    z-index: ${zIndex.raised};
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
  TimeAxis: styled.div<{ $height: number }>`
    position: relative;
    height: ${({ $height }) => $height}px;
  `,
  HourLabel: styled.span<{ $top: number }>`
    position: absolute;
    top: ${({ $top }) => $top}px;
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
  DayColumn: styled.div<{ $height: number }>`
    position: relative;
    height: ${({ $height }) => $height}px;
    border-left: 1px solid var(--border);
  `,
  HourLine: styled.div<{ $top: number }>`
    position: absolute;
    top: ${({ $top }) => $top}px;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--border);
    opacity: 0.6;
  `,
  Block: styled.div<{ $top: number; $height: number; $left: string; $width: string; $color: string }>`
    position: absolute;
    top: ${({ $top }) => $top}px;
    height: ${({ $height }) => $height}px;
    left: ${({ $left }) => $left};
    width: ${({ $width }) => $width};
    background: ${({ $color }) => $color};
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
    box-shadow: ${shadow.resting};
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
      box-shadow: ${shadow.hover};
      z-index: ${zIndex.raised + 1};
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
  DetailAccent: styled.div<{ $color: string }>`
    height: 6px;
    flex-shrink: 0;
    background: ${({ $color }) => $color};
  `,
  DetailBody: styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px;
    overflow-y: auto;
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
  CoursePill: styled.span<{ $color: string }>`
    display: inline-flex;
    align-self: flex-start;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    background: ${({ $color }) => `${$color}26`};
    color: ${({ $color }) => $color};
  `,
  MeetingList: styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
  `,
  MeetingRow: styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    padding: 6px 10px;
    border-radius: 8px;
    background: var(--bg);
    font-size: 12px;
    line-height: 1.2;
    color: var(--text);
  `,
  MeetingTime: styled.span`
    font-weight: 600;
    flex-shrink: 0;
  `,
  MeetingLocationText: styled.span`
    color: var(--text-muted);
    font-size: 11px;
  `,
  DayChip: styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 3px;
    border-radius: 999px;
    background: var(--border);
    color: var(--text-muted);
    font-size: 10px;
    font-weight: 800;
    flex-shrink: 0;
  `,
  SectionChip: styled.span`
    display: inline-flex;
    align-items: center;
    margin-left: auto;
    padding: 1px 6px;
    border-radius: 999px;
    background: var(--border);
    color: var(--text-muted);
    font-size: 10px;
    font-weight: 700;
    flex-shrink: 0;
  `,
  RatingBadge: styled.span<{ $color: string }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 36px;
    height: 28px;
    padding: 0 8px;
    border-radius: 999px;
    background: ${({ $color }) => $color};
    color: ${brand.white};
    font-size: 13px;
    font-weight: 800;
    flex-shrink: 0;
  `,
  RatingBadgeCompact: styled.span<{ $color: string }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 26px;
    height: 18px;
    padding: 0 5px;
    border-radius: 999px;
    background: ${({ $color }) => $color};
    color: ${brand.white};
    font-size: 10px;
    font-weight: 800;
    flex-shrink: 0;
  `,
  ProfessorButton: styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  `,
  ProfessorName: styled.span`
    font-size: 13px;
    color: var(--text-muted);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
    gap: 6px;
    min-width: 0;
    padding: 12px 14px;
    border-radius: 14px;
  `,
  SectionHeader: styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  `,
  SectionInfo: styled.div`
    display: flex;
    flex-direction: column;
    min-width: 0;
  `,
  CourseCodeRow: styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
  `,
  InfoButton: styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--text-muted);
    font-size: 13px;
    cursor: pointer;
    transition: color ${motion.duration.fast} ${motion.easing.standard};

    &:hover {
      color: var(--accent);
    }
  `,
  FilterMenuWrap: styled.div`
    position: relative;
    flex: 1;
    min-width: 0;
  `,
  FilterButton: styled.button<{ $active: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    width: 100%;
    padding: 10px 12px;
    border-radius: ${radius.sm};
    border: 1px solid ${({ $active }) => ($active ? 'var(--accent)' : 'var(--border)')};
    background: var(--bg);
    color: var(--text);
    font: inherit;
    font-size: 14px;
    cursor: pointer;

    span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    svg {
      flex-shrink: 0;
      width: 10px;
      height: 10px;
      color: var(--text-muted);
      transition: transform ${motion.duration.fast} ${motion.easing.standard};
      transform: rotate(${({ $active }) => ($active ? '180deg' : '0deg')});
    }
  `,
  // This dropdown opens from inside the search modal, so it must render above zIndex.modal
  // (not the generic zIndex.dropdown tier) or it would be hidden behind that still-open modal.
  FilterMenuBackdrop: styled.div`
    position: fixed;
    inset: 0;
    z-index: ${zIndex.modal + 1};
  `,
  FilterMenu: styled.div<{ $top: number; $left: number; $width: number }>`
    position: fixed;
    top: ${({ $top }) => $top}px;
    left: ${({ $left }) => $left}px;
    width: ${({ $width }) => $width}px;
    z-index: ${zIndex.modal + 2};
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: min(320px, 60vh);
    overflow-y: auto;
    padding: 6px;
    border-radius: ${radius.md};
    border: 1px solid var(--border);
    background: var(--bg-elevated);
    box-shadow: ${shadow.lg};
  `,
  FilterMenuItem: styled.button<{ $selected: boolean }>`
    display: block;
    width: 100%;
    min-height: 40px;
    padding: 10px 12px;
    border: none;
    border-radius: ${radius.sm};
    background: ${({ $selected }) => ($selected ? 'var(--bg)' : 'transparent')};
    color: ${({ $selected }) => ($selected ? 'var(--accent)' : 'var(--text)')};
    font: inherit;
    font-size: 14px;
    line-height: 1.4;
    font-weight: ${({ $selected }) => ($selected ? '700' : '500')};
    text-align: left;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex-shrink: 0;

    &:hover {
      background: var(--bg);
    }
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
    margin-top: 2px;
    padding-top: 10px;
    border-top: 1px solid var(--border);

    @media (min-width: 768px) {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 10px;
    }
  `,
  OptionCard: styled.button<{ $selected: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    min-width: 0;
    padding: 8px 10px;
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
    z-index: ${zIndex.fab};
  `,
  FabWrap: styled.div`
    position: fixed;
    right: 20px;
    bottom: calc(64px + env(safe-area-inset-bottom) + 20px);
    z-index: ${zIndex.fab + 1};
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
    box-shadow: ${shadow.card};
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
    box-shadow: ${shadow.fab};
    transition: transform 0.1s ease;

    &:hover {
      transform: scale(1.05);
    }
  `,
}
