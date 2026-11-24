import { useRef, type KeyboardEvent } from 'react'

export interface TabItem<T extends string> {
  value: T
  label: string
}

interface TabsProps<T extends string> {
  label: string // tablist의 접근성 이름
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  idPrefix: string // 탭 id는 `${idPrefix}-tab-${value}`, 패널 id는 `${idPrefix}-panel`
  size?: 'md' | 'sm' // md: 화면을 나누는 탭(굵은 바닥 줄), sm: 영역 안의 보기 탭
}

// 바닥 줄 위에 탭을 같은 폭으로 나눈다. 고른 탭은 굵은 글씨 + 아래 accent 줄이 바닥 줄을 덮는다
const LIST_CLASS = {
  md: 'flex border-b-2 border-line',
  sm: 'flex border-b border-line',
} as const
const TAB_SIZE_CLASS = {
  md: '-mb-0.5 min-h-12 border-b-[3px] px-1 text-base',
  sm: '-mb-px min-h-11 border-b-2 px-0.5 text-sm',
} as const
const TAB_STATE_CLASS = {
  selected: 'border-accent font-bold text-fg',
  idle: 'border-transparent font-semibold text-muted hover:text-fg',
} as const

// 탭 목록. 왼쪽·오른쪽 화살표, Home·End로 옮기면 바로 바뀐다. 패널은 부르는 쪽이 `role="tabpanel"`로 그린다
export default function Tabs<T extends string>({ label, items, value, onChange, idPrefix, size = 'md' }: TabsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null)

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const current = items.findIndex((item) => item.value === value)
    let next: number
    if (e.key === 'ArrowRight') next = (current + 1) % items.length
    else if (e.key === 'ArrowLeft') next = (current - 1 + items.length) % items.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = items.length - 1
    else return
    e.preventDefault()
    onChange(items[next].value)
    listRef.current?.querySelector<HTMLButtonElement>(`#${idPrefix}-tab-${items[next].value}`)?.focus()
  }

  return (
    <div ref={listRef} role="tablist" aria-label={label} className={LIST_CLASS[size]} onKeyDown={handleKeyDown}>
      {items.map((item) => {
        const selected = item.value === value
        return (
          <button
            key={item.value}
            id={`${idPrefix}-tab-${item.value}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={selected ? 0 : -1}
            className={`flex-1 whitespace-nowrap ${TAB_SIZE_CLASS[size]} ${TAB_STATE_CLASS[selected ? 'selected' : 'idle']}`}
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
