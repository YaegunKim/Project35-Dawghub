import styled from '@emotion/styled'
import { css } from '@emotion/react'
import { Link } from 'react-router-dom'
import { radius } from '../radius'
import { shadow } from '../shadow'
import { motion } from '../motion'

const cardStyles = css`
  padding: 14px 16px;
  border-radius: ${radius.md};
  border: 1px solid var(--border);
  color: var(--text);
  background: var(--bg);
  box-shadow: ${shadow.sm};
  transition:
    box-shadow ${motion.duration.fast} ${motion.easing.standard},
    transform ${motion.duration.fast} ${motion.easing.standard};
`

export const S = {
  Card: styled.div`
    ${cardStyles}
  `,
  CardLink: styled(Link)`
    ${cardStyles}
    display: block;

    &:active {
      transform: scale(0.98);
    }
  `,
}
