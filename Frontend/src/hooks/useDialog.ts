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

export interface ProgressOptions {
  title: string
  message: string
}

export interface DialogContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  alert: (options: AlertOptions) => Promise<void>
  progress: <T>(options: ProgressOptions, task: () => Promise<T>) => Promise<T>
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

// 오래 걸리는 일을 하는 동안 로딩 창을 띄운다(버튼 없음, Esc로 닫히지 않음). task가 끝나면 닫고 결과를 그대로 돌려준다.
// 끝난 뒤 결과를 알리려면 바로 useAlert를 부른다(창이 끊기지 않고 내용만 바뀐다)
export function useProgress(): DialogContextValue['progress'] {
  return useDialogContext().progress
}
