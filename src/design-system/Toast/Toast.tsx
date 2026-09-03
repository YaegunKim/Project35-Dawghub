import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { S, type ToastVariant } from './Toast.style'

export type ShowToastOptions = {
  message: string
  variant?: ToastVariant
  actionLabel?: string
  onAction?: () => void
}

type ToastContextValue = {
  showToast: (options: ShowToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

type ToastItem = ShowToastOptions & { id: number }

const DEFAULT_DURATION_MS = 4000
// Toasts with an action stay up longer so there's real time to tap it.
const ACTION_DURATION_MS = 5000

// Toasts are for action-feedback only (a failure, or a reversible action's undo window) —
// success needs no extra chrome, since the UI already shows it (the new post appears, the
// deleted row disappears). See ai/design-system.md.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (options: ShowToastOptions) => {
      const id = nextId.current++
      setToasts((prev) => [...prev, { ...options, id }])
      setTimeout(() => dismiss(id), options.actionLabel ? ACTION_DURATION_MS : DEFAULT_DURATION_MS)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <S.Stack>
        {toasts.map((toast) => (
          <S.Toast key={toast.id} $variant={toast.variant ?? 'default'} role="status">
            <S.Message>{toast.message}</S.Message>
            {toast.actionLabel && (
              <S.ActionButton
                type="button"
                onClick={() => {
                  toast.onAction?.()
                  dismiss(toast.id)
                }}
              >
                {toast.actionLabel}
              </S.ActionButton>
            )}
          </S.Toast>
        ))}
      </S.Stack>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within a ToastProvider')
  return context
}
