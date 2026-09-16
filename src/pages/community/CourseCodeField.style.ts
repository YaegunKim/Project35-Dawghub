import styled from '@emotion/styled'
import { surface, brand } from '../../design-system/colors'
import { radius } from '../../design-system/radius'
import { shadow } from '../../design-system/shadow'
import { zIndex } from '../../design-system/zIndex'

export const S = {
  Wrap: styled.div`
    position: relative;
  `,
  Attached: styled.div`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
    padding: 4px 8px;
    border-radius: ${radius.pill};
    background: var(--accent);
    color: var(--accent-contrast);
    font-size: 12px;
    font-weight: 600;
  `,
  RemoveButton: styled.button`
    border: none;
    background: none;
    color: inherit;
    font-size: 14px;
    line-height: 1;
    padding: 0;
    cursor: pointer;
  `,
  List: styled.ul`
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    margin: 0;
    padding: 4px;
    list-style: none;
    background: ${surface.bgElevated};
    border: 1px solid ${surface.border};
    border-radius: ${radius.md};
    box-shadow: ${shadow.floating};
    z-index: ${zIndex.dropdown};
    max-height: 220px;
    overflow-y: auto;
  `,
  Option: styled.li`
    padding: 8px 10px;
    border-radius: ${radius.sm};
    font-size: 13px;
    cursor: pointer;

    &:hover {
      background: ${brand.primary}14;
    }
  `,
}
