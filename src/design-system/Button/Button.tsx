import type { ButtonHTMLAttributes } from 'react'
import { S } from './Button.style'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary'
}

export function Button({ variant = 'primary', ...props }: ButtonProps) {
  return <S.Button $variant={variant} {...props} />
}
