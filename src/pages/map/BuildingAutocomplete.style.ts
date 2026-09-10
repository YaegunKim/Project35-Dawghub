import styled from '@emotion/styled'
import { radius } from '../../design-system/radius'
import { shadow } from '../../design-system/shadow'
import { spacing } from '../../design-system/spacing'
import { zIndex } from '../../design-system/zIndex'

export const S = {
  // Wraps the shared Input so the dropdown below can be positioned relative to exactly this
  // field, not the whole Directions sheet — a native <datalist>'s popup ignores CSS entirely
  // (its width/position are browser-controlled), which is exactly what this replaces.
  Wrap: styled.div`
    position: relative;
    flex: 1;
    min-width: 0;
  `,
  List: styled.ul`
    position: absolute;
    top: calc(100% + ${spacing.xs});
    left: 0;
    right: 0;
    z-index: ${zIndex.overlay + 60};
    margin: 0;
    padding: ${spacing.xs};
    list-style: none;
    max-height: 240px;
    overflow-y: auto;
    border-radius: ${radius.md};
    background: var(--bg);
    box-shadow: ${shadow.md};
  `,
  Option: styled.li<{ $highlighted: boolean }>`
    padding: ${spacing.sm} ${spacing.md};
    border-radius: ${radius.sm};
    font-size: 14px;
    color: var(--text);
    background: ${({ $highlighted }) => ($highlighted ? 'var(--bg-elevated)' : 'transparent')};
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
}
