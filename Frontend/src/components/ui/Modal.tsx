import { useEffect, useId, useRef, type ReactNode } from 'react'
import IconButton from './IconButton.tsx'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void // Esc를 눌렀을 때(시트는 ✕·바깥을 눌렀을 때도). 가운데 창은 바깥을 눌러서는 닫지 않는다
  children: ReactNode
  actions?: ReactNode // 아래 오른쪽 정렬 버튼 줄
  variant?: 'dialog' | 'sheet' // dialog: 가운데 창(기본), sheet: 아래에서 올라오는 시트
  titleAside?: ReactNode // 시트 제목 오른쪽 보조 글(예: 1/4)
}

// 시트의 <dialog>는 화면 전체를 덮는 투명 판이고, 시트 모양은 안쪽 패널이 가진다(바깥 클릭이 dialog 자신에 떨어지도록)
const DIALOG_CLASSES = {
  dialog:
    'm-auto w-[calc(100%-32px)] max-w-[448px] rounded-2xl border border-line bg-bg p-5 text-fg shadow-lg backdrop:bg-scrim',
  sheet:
    'm-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 text-fg backdrop:bg-scrim open:flex open:items-end open:justify-center',
} as const

const PANEL_CLASSES = {
  dialog: '',
  sheet:
    'flex max-h-[85dvh] w-full max-w-[480px] flex-col rounded-t-2xl border-x border-t border-line bg-bg px-5 pt-3 pb-5 shadow-lg',
} as const

// 네이티브 <dialog>를 showModal()로 열어 포커스가 창 밖으로 나가지 않는다. 열고 닫는 상태는 부모가 가진다
export default function Modal({ open, title, onClose, children, actions, variant = 'dialog', titleAside }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const bodyId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  const isSheet = variant === 'sheet'

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      className={DIALOG_CLASSES[variant]}
      onCancel={(e) => {
        // 닫는 일은 부모가 open을 바꿔서 한다
        e.preventDefault()
        onClose()
      }}
      // 시트만: 패널 밖(dialog 자신)을 누르면 닫는다. 가운데 창은 입력 중 실수를 막으려고 닫지 않는다
      onClick={(e) => {
        if (isSheet && e.target === dialogRef.current) onClose()
      }}
      // 브라우저가 cancel 없이 직접 닫은 경우(open이 아직 true)에만 부모에게 알린다
      onClose={() => {
        if (open) onClose()
      }}
    >
      <div className={PANEL_CLASSES[variant]}>
        {isSheet ? (
          <div className="flex shrink-0 items-center gap-2">
            <h2 id={titleId} className="text-[17px] font-bold">
              {title}
            </h2>
            {titleAside && <span className="text-muted">{titleAside}</span>}
            <IconButton icon="close" label="닫기" className="ml-auto -mr-2" onClick={onClose} />
          </div>
        ) : (
          <h2 id={titleId} className="text-[17px] font-bold">
            {title}
          </h2>
        )}
        <div id={bodyId} className={isSheet ? 'mt-2 min-h-0 flex-1 overflow-y-auto' : 'mt-2'}>
          {children}
        </div>
        {actions && <div className="mt-5 flex shrink-0 justify-end gap-2">{actions}</div>}
      </div>
    </dialog>
  )
}
