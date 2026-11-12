import { createContext, useContext } from 'react'

export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string // 기본 '확인'
  tone?: 'default' | 'danger'
}

export interface AlertOptions {
  title: string
  message: string
}

export interface DialogContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  alert: (options: AlertOptions) => Promise<void>
}

export const DialogContext = createContext<DialogContextValue | null>(null)

function useDialogContext(): DialogContextValue {
  const value = useContext(DialogContext)
  if (!value) throw new Error('DialogProvider 안에서만 쓸 수 있어요.')
  return value
}

// window.confirm 대신 쓰는 확인 창. 확인하면 true, 취소·Esc면 false
export function useConfirm(): DialogContextValue['confirm'] {
  return useDialogContext().confirm
}

// window.alert 대신 쓰는 알림 창. 확인을 누르면 끝난다
export function useAlert(): DialogContextValue['alert'] {
  return useDialogContext().alert
}
