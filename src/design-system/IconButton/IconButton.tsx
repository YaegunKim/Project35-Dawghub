import type { ButtonHTMLAttributes } from 'react'
import { S } from './IconButton.style'

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement>

export function IconButton({ type = 'button', ...props }: IconButtonProps) {
  return <S.IconButton type={type} {...props} />
}
