import { useEffect, useId, useRef, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void // Esc를 눌렀을 때. 바깥을 눌러서는 닫지 않는다
  children: ReactNode
  actions?: ReactNode // 아래 오른쪽 정렬 버튼 줄
}

// 네이티브 <dialog>를 showModal()로 열어 포커스가 창 밖으로 나가지 않는다. 열고 닫는 상태는 부모가 가진다
export default function Modal({ open, title, onClose, children, actions }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="m-auto w-[calc(100%-32px)] max-w-[448px] rounded-2xl border border-line bg-bg p-5 text-fg shadow-lg backdrop:bg-scrim"
      onCancel={(e) => {
        // 닫는 일은 부모가 open을 바꿔서 한다
        e.preventDefault()
        onClose()
      }}
    >
      <h2 id={titleId} className="text-[17px] font-bold">
        {title}
      </h2>
      <div className="mt-2">{children}</div>
      {actions && <div className="mt-5 flex justify-end gap-2">{actions}</div>}
    </dialog>
  )
}
