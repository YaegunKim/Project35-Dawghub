import type { ReactNode } from 'react'
import { S, type BadgeVariant } from './Badge.style'

type BadgeProps = {
  variant: BadgeVariant
  children: ReactNode
}

// A dot + text status pill (e.g. "Open"/"Closed") — pairs color with a dot and label rather
// than relying on color alone, per standard status-badge accessibility guidance.
export function Badge({ variant, children }: BadgeProps) {
  return (
    <S.Badge $variant={variant}>
      <S.Dot $variant={variant} />
      {children}
    </S.Badge>
  )
}
