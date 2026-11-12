import type { ComponentPropsWithRef } from 'react'

// ref도 그대로 넘긴다(Menu가 ⋮ 버튼으로 포커스를 돌려줄 때 쓴다)
interface IconButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'type' | 'children' | 'aria-label'> {
  label: string // 접근성 이름 (예: "교재 추가")
  icon: 'plus' | 'kebab'
}

// 아이콘만 있는 44px 버튼. 영역 제목 줄의 +, Menu의 ⋮에 쓴다
export default function IconButton({ label, icon, className, ...rest }: IconButtonProps) {
  const classes = [
    'grid size-11 place-items-center rounded-xl text-muted hover:bg-surface disabled:opacity-50',
    className ?? '',
  ]
  return (
    <button {...rest} type="button" aria-label={label} className={classes.filter(Boolean).join(' ')}>
      {icon === 'plus' ? <PlusIcon /> : <KebabIcon />}
    </button>
  )
}

function PlusIcon() {
  return (
    <svg
      className="size-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
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
