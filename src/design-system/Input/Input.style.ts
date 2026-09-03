import styled from '@emotion/styled'
import { radius } from '../radius'
import { spacing } from '../spacing'
import { typography } from '../typography'
import { focusRing } from '../motion'

export const S = {
  Input: styled.input`
    padding: ${spacing.sm} ${spacing.md};
    border-radius: ${radius.sm};
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    font-size: ${typography.size.md};

    &:focus-visible {
      ${focusRing}
    }
  `,
}
