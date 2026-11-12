import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  DialogContext,
  type AlertOptions,
  type ConfirmOptions,
  type DialogContextValue,
  type ProgressOptions,
} from '../../hooks/useDialog.ts'
import Button from './Button.tsx'
import Modal from './Modal.tsx'

interface DialogProviderProps {
  children: ReactNode
}

// 대기 중인 요청 하나. 닫을 때 resolve로 결과를 돌려준다. 진행 창은 task가 끝나면 스스로 닫는다
type PendingDialog =
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (ok: boolean) => void }
  | { kind: 'alert'; options: AlertOptions; resolve: () => void }
  | { kind: 'progress'; options: ProgressOptions; resolve: () => void }

function cancel(dialog: PendingDialog | null) {
  if (dialog?.kind === 'confirm') dialog.resolve(false)
  else dialog?.resolve()
}

// useConfirm·useAlert·useProgress가 여는 창을 그린다. 요청은 한 번에 하나만 처리한다
export default function DialogProvider({ children }: DialogProviderProps) {
  const [pending, setPending] = useState<PendingDialog | null>(null)
  // state는 창을 그리는 데, ref는 이미 정해진 Promise를 한 번만 푸는 데 쓴다(렌더를 기다리지 않고 읽어야 한다)
  const pendingRef = useRef<PendingDialog | null>(null)

  // 제공자가 사라질 때 기다리는 쪽이 멈추지 않게 취소로 푼다
  useEffect(() => {
    return () => {
      cancel(pendingRef.current)
      pendingRef.current = null
    }
  }, [])

  // 이미 열린 창이 있으면 먼저 취소로 닫아 기다리는 쪽이 멈추지 않게 한다
  const open = useCallback((next: PendingDialog) => {
    cancel(pendingRef.current)
    pendingRef.current = next
    setPending(next)
  }, [])

  const close = useCallback((dialog: PendingDialog) => {
    if (pendingRef.current !== dialog) return
    pendingRef.current = null
    setPending(null)
  }, [])

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => open({ kind: 'confirm', options, resolve })),
    [open],
  )
  const alert = useCallback(
    (options: AlertOptions) => new Promise<void>((resolve) => open({ kind: 'alert', options, resolve })),
    [open],
  )
  const progress = useCallback(
    async <T,>(options: ProgressOptions, task: () => Promise<T>): Promise<T> => {
      const dialog: PendingDialog = { kind: 'progress', options, resolve: () => {} }
      open(dialog)
      try {
        return await task()
      } finally {
        // 그사이 다른 창이 열렸으면 그 창은 두고, 이 진행 창일 때만 닫는다
        close(dialog)
      }
    },
    [open, close],
  )
  const value = useMemo<DialogContextValue>(() => ({ confirm, alert, progress }), [confirm, alert, progress])

  function finish(ok: boolean) {
    const current = pendingRef.current
    if (!current || current.kind === 'progress') return
    if (current.kind === 'confirm') current.resolve(ok)
    else current.resolve()
    close(current)
  }

  return (
    <DialogContext value={value}>
      {children}
      <Modal
        open={pending !== null}
        title={pending?.options.title ?? ''}
        // 진행 창은 Esc로 닫히지 않는다(finish가 무시한다)
        onClose={() => finish(false)}
        actions={
          pending?.kind === 'confirm' ? (
            <>
              <Button type="button" variant="ghost" onClick={() => finish(false)}>
                취소
              </Button>
              <Button
                type="button"
                variant={pending.options.tone === 'danger' ? 'danger' : 'primary'}
                onClick={() => finish(true)}
              >
                {pending.options.confirmLabel ?? '확인'}
              </Button>
            </>
          ) : pending?.kind === 'alert' ? (
            <Button type="button" onClick={() => finish(true)}>
              확인
            </Button>
          ) : undefined
        }
      >
        {pending?.kind === 'progress' ? (
          <div className="flex items-center gap-3" role="status">
            <span
              className="size-5 shrink-0 animate-spin rounded-full border-2 border-line border-t-accent motion-reduce:animate-none"
              aria-hidden="true"
            />
            <p className="text-muted">{pending.options.message}</p>
          </div>
        ) : (
          <p className="text-muted">{pending?.options.message}</p>
        )}
      </Modal>
    </DialogContext>
  )
}
