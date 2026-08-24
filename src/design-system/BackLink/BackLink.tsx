import type { ReactNode } from 'react'
import { S } from './BackLink.style'

type BackLinkProps = {
  to: string
  children: ReactNode
}

export function BackLink({ to, children }: BackLinkProps) {
  return <S.BackLink to={to}>← {children}</S.BackLink>
}
