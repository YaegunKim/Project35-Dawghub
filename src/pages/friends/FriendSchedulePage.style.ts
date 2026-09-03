import styled from '@emotion/styled'
import { brand } from '../../design-system/colors'
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
    gap: 8px;
    min-width: 0;
    padding: 16px;

    @media (min-width: 768px) {
      padding: 32px;
    }
  `,
  TitleRow: styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  `,
  TitleWrap: styled.div`
    min-width: 0;
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
    box-shadow: ${shadow.resting};

    @media (min-width: 480px) {
      gap: 2px;
      border-radius: 8px;
      padding: 5px 8px;
      font-size: 11px;
      line-height: 1.35;
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
}
