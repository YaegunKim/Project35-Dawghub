import type { ButtonHTMLAttributes } from 'react'
import { S, type IconButtonSize } from './IconButton.style'

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: IconButtonSize
}

export function IconButton({ type = 'button', size = 'sm', ...props }: IconButtonProps) {
  return <S.IconButton type={type} $size={size} {...props} />
}
