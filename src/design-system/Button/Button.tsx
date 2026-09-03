import type { ButtonHTMLAttributes } from 'react'
import { S, type ButtonSize, type ButtonVariant } from './Button.style'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <S.Button $variant={variant} $size={size} $fullWidth={fullWidth} disabled={disabled || loading} {...props}>
      {loading && <S.Spinner aria-hidden />}
      {children}
    </S.Button>
  )
}
