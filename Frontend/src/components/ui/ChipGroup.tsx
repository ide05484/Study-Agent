import { useRef, type KeyboardEvent } from 'react'

export interface ChipOption<T extends string> {
  value: T
  label: string
}

interface ChipGroupProps<T extends string> {
  label: string // 그룹의 접근성 이름
  options: ChipOption<T>[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
}

const chipBaseClass = 'min-h-11 rounded-xl border px-3 disabled:opacity-50'
const chipStateClass = {
  selected: 'border-accent bg-accent-soft font-bold text-fg',
  unselected: 'border-line text-muted',
} as const

// <select> 대신 쓰는 한 줄 선택. 칩 하나만 Tab 순서에 들어가고 ←·→로 옮기면 바로 선택된다
export default function ChipGroup<T extends string>({ label, options, value, onChange, disabled }: ChipGroupProps<T>) {
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([])
  // 고른 값이 목록에 없으면 첫 칩이 Tab을 받는다
  const tabbableIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  )

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number
    if (e.key === 'ArrowRight') next = (index + 1) % options.length
    else if (e.key === 'ArrowLeft') next = (index - 1 + options.length) % options.length
    else return
    e.preventDefault()
    onChange(options[next].value)
    chipRefs.current[next]?.focus()
  }

  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option, index) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            ref={(el) => {
              chipRefs.current[index] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={index === tabbableIndex ? 0 : -1}
            disabled={disabled}
            className={`${chipBaseClass} ${selected ? chipStateClass.selected : chipStateClass.unselected}`}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
