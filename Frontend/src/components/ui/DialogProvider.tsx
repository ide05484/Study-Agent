import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  DialogContext,
  type AlertOptions,
  type ConfirmOptions,
  type DialogContextValue,
} from '../../hooks/useDialog.ts'
import Button from './Button.tsx'
import Modal from './Modal.tsx'

interface DialogProviderProps {
  children: ReactNode
}

// 대기 중인 요청 하나. 닫을 때 resolve로 결과를 돌려준다
type PendingDialog =
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (ok: boolean) => void }
  | { kind: 'alert'; options: AlertOptions; resolve: () => void }

// useConfirm·useAlert가 여는 확인·알림 창을 그린다. 요청은 한 번에 하나만 처리한다
export default function DialogProvider({ children }: DialogProviderProps) {
  const [pending, setPending] = useState<PendingDialog | null>(null)
  // state는 창을 그리는 데, ref는 이미 정해진 Promise를 한 번만 푸는 데 쓴다(렌더를 기다리지 않고 읽어야 한다)
  const pendingRef = useRef<PendingDialog | null>(null)

  // 제공자가 사라질 때 기다리는 쪽이 멈추지 않게 취소로 푼다
  useEffect(() => {
    return () => {
      const current = pendingRef.current
      if (current?.kind === 'confirm') current.resolve(false)
      else current?.resolve()
      pendingRef.current = null
    }
  }, [])

  // 이미 열린 창이 있으면 먼저 취소로 닫아 기다리는 쪽이 멈추지 않게 한다
  const open = useCallback((next: PendingDialog) => {
    const previous = pendingRef.current
    if (previous?.kind === 'confirm') previous.resolve(false)
    else previous?.resolve()
    pendingRef.current = next
    setPending(next)
  }, [])

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => open({ kind: 'confirm', options, resolve })),
    [open],
  )
  const alert = useCallback(
    (options: AlertOptions) => new Promise<void>((resolve) => open({ kind: 'alert', options, resolve })),
    [open],
  )
  const value = useMemo<DialogContextValue>(() => ({ confirm, alert }), [confirm, alert])

  function finish(ok: boolean) {
    const current = pendingRef.current
    if (!current) return
    if (current.kind === 'confirm') current.resolve(ok)
    else current.resolve()
    pendingRef.current = null
    setPending(null)
  }

  return (
    <DialogContext value={value}>
      {children}
      <Modal
        open={pending !== null}
        title={pending?.options.title ?? ''}
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
          ) : (
            <Button type="button" onClick={() => finish(true)}>
              확인
            </Button>
          )
        }
      >
        <p className="text-muted">{pending?.options.message}</p>
      </Modal>
    </DialogContext>
  )
}
