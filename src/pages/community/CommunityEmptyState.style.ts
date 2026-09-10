import styled from '@emotion/styled'
import { spacing } from '../../design-system/spacing'
import { radius } from '../../design-system/radius'
import { surface } from '../../design-system/colors'

export const S = {
  Wrap: styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${spacing.sm};
    padding: ${spacing.xl} ${spacing.lg};
    border-radius: ${radius.lg};
    background: ${surface.bgElevated};
    border: 1px dashed ${surface.border};
    text-align: center;
  `,
  Mascot: styled.div`
    opacity: 0.55;
    filter: grayscale(0.4);
  `,
  Message: styled.p`
    margin: 0;
    font-size: 14px;
    color: ${surface.textMuted};
  `,
}
