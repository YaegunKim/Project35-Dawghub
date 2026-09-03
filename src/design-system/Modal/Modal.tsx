import type { MouseEvent, ReactNode } from 'react'
import { S } from './Modal.style'

type ModalProps = {
  onClose: () => void
  children: ReactNode
  maxWidth?: string
  maxWidthTablet?: string
  maxHeight?: string
}

// Backdrop (click-to-close) + centered panel shell shared by every modal in the app — the
// header/body layout inside varies per use case, so only the shell (radius/shadow/animation/
// z-index/outside-click) is unified here.
export function Modal({ onClose, children, maxWidth = '380px', maxWidthTablet, maxHeight = '80vh' }: ModalProps) {
  function stopPropagation(event: MouseEvent) {
    event.stopPropagation()
  }

  return (
    <S.Backdrop onClick={onClose}>
      <S.Panel $maxWidth={maxWidth} $maxWidthTablet={maxWidthTablet} $maxHeight={maxHeight} onClick={stopPropagation}>
        {children}
      </S.Panel>
    </S.Backdrop>
  )
}
