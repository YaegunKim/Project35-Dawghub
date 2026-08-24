import { S } from './Skeleton.style'

type SkeletonProps = {
  width?: string
  height?: string
  radius?: string
}

export function Skeleton({ width, height, radius }: SkeletonProps) {
  return <S.Skeleton $width={width} $height={height} $radius={radius} aria-hidden />
}
