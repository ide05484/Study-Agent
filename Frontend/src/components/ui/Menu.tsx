import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'

export interface MenuItem {
  label: string
  onSelect: () => void
  tone?: 'default' | 'danger'
}

interface MenuProps {
  label: string // ⋮ 버튼의 접근성 이름 (예: "기본서 메뉴")
  items: MenuItem[]
}

const itemBaseClass =
  'flex min-h-11 w-full items-center px-4 text-left hover:bg-surface focus:bg-surface focus:outline-none'
const itemToneClass = {
  default: '',
  danger: 'text-danger',
} as const

// ⋮ 버튼을 누르면 아래에 작은 메뉴가 열린다. 바깥을 누르거나 Esc를 누르면 닫힌다
export default function Menu({ label, items }: MenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
    function handlePointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  function close() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  // Esc로 닫고, 위·아래 화살표로 항목 사이를 옮긴다
  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!open) return
    if (e.key === 'Escape') {
      e.stopPropagation()
      close()
      return
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const buttons = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])]
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const next = (current + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
    buttons[next]?.focus()
  }

  // 항목이 포커스를 다른 곳으로 옮기거나(선택 모드의 취소 버튼 등) ⋮가 사라질 수 있어,
  // 고른 뒤에도 포커스가 메뉴 안에 남아 있을 때만 ⋮로 돌려준다
  function select(item: MenuItem) {
    setOpen(false)
    item.onSelect()
    if (rootRef.current?.contains(document.activeElement)) triggerRef.current?.focus()
  }

  // Tab 등으로 포커스가 메뉴 밖으로 나가면 닫는다
  function handleBlur(e: FocusEvent<HTMLDivElement>) {
    if (open && !rootRef.current?.contains(e.relatedTarget as Node | null)) setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative" onKeyDown={handleKeyDown} onBlur={handleBlur}>
      <button
        ref={triggerRef}
        type="button"
        className="grid size-11 place-items-center rounded-xl text-muted hover:bg-surface"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(!open)}
      >
        <KebabIcon />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          className="absolute top-full right-0 z-20 mt-1 min-w-28 overflow-hidden rounded-xl border border-line bg-bg py-1 shadow-lg"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={[itemBaseClass, itemToneClass[item.tone ?? 'default']].filter(Boolean).join(' ')}
              onClick={() => select(item)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function KebabIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  )
}
