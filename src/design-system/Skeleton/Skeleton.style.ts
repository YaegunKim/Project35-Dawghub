import styled from '@emotion/styled'
import { keyframes } from '@emotion/react'
import { radius } from '../radius'

const shimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`

export const S = {
  Skeleton: styled.div<{ $width?: string; $height?: string; $radius?: string }>`
    width: ${({ $width }) => $width ?? '100%'};
    height: ${({ $height }) => $height ?? '16px'};
    border-radius: ${({ $radius }) => $radius ?? radius.sm};
    background: linear-gradient(
      90deg,
      var(--bg-elevated) 25%,
      var(--border) 50%,
      var(--bg-elevated) 75%
    );
    background-size: 200% 100%;
    animation: ${shimmer} 1.4s ease-in-out infinite;
  `,
}
