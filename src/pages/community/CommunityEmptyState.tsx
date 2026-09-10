import type { ReactNode } from 'react'
import { Logo } from '../../design-system/Brand/Logo'
import { Button } from '../../design-system/Button/Button'
import { S } from './CommunityEmptyState.style'

type Props = {
  message: string
  action?: { label: string; onClick: () => void }
  children?: ReactNode
}

// The shared "nothing here yet / couldn't load" state for every Community screen —
// reuses the bulldog mascot (design-system/Brand/Logo) muted to a sleepy grayscale
// instead of a bare line of gray text, so an empty board still feels like part of a
// designed app rather than an unstyled placeholder.
export function CommunityEmptyState({ message, action, children }: Props) {
  return (
    <S.Wrap>
      <S.Mascot>
        <Logo size={48} />
      </S.Mascot>
      <S.Message>{message}</S.Message>
      {children}
      {action && (
        <Button size="sm" variant="secondary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </S.Wrap>
  )
}
