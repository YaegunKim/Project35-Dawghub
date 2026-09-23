import styled from '@emotion/styled'
import { brand } from '../../design-system/colors'
import { radius } from '../../design-system/radius'
import { spacing } from '../../design-system/spacing'

export const S = {
  Wrap: styled.div`
    position: relative;
    display: flex;
    flex-direction: column;
  `,
  // A single connecting line through every stop dot, drawn once behind the whole list rather
  // than per-row — a per-row border would show gaps at each row's own padding instead of one
  // continuous rail.
  Rail: styled.div`
    position: absolute;
    top: 10px;
    bottom: 10px;
    left: 9px;
    width: 2px;
    background: var(--border);
  `,
  StopRow: styled.button`
    position: relative;
    display: flex;
    align-items: center;
    gap: ${spacing.md};
    padding: ${spacing.sm} 0;
    border: none;
    background: transparent;
    color: var(--text);
    font: inherit;
    text-align: left;
    cursor: pointer;
  `,
  StopDot: styled.span`
    position: relative;
    z-index: 1;
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-muted);
  `,
  StopName: styled.span`
    flex: 1;
    min-width: 0;
    font-size: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  EtaChip: styled.span`
    flex-shrink: 0;
    padding: 2px ${spacing.sm};
    border-radius: ${radius.pill};
    background: var(--bg-elevated);
    color: var(--accent);
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
  `,
  // Positioned via inline `top` (a real interpolated pixel offset measured from the two stops
  // it's between — see the component), not CSS — that offset only exists at render time.
  BusMarker: styled.div<{ $color: string }>`
    position: absolute;
    left: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    transform: translate(-6px, -10px);
    background: ${({ $color }) => $color};
    color: ${brand.white};
    font-size: 10px;
    box-shadow: 0 0 0 2px var(--bg);
  `,
}
