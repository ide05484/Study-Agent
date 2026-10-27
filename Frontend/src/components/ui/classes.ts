// 여러 화면에서 반복되는 Tailwind 클래스 묶음

export const cardClass = 'rounded-2xl bg-surface p-4'

export const sectionTitleClass = 'mb-3 text-base font-bold'

export const buttonClass =
  'min-h-11 rounded-xl bg-accent px-4 font-semibold text-on-accent disabled:opacity-50'

export const ghostButtonClass = 'min-h-11 rounded-xl border border-line bg-bg px-4 text-fg disabled:opacity-50'

export const fieldClass = 'min-h-11 w-full rounded-xl border border-line bg-bg px-3 py-2 disabled:opacity-60'

// 아래 방향 화살표. 열림 상태는 호출하는 쪽에서 회전 클래스를 더한다
export const chevronClass = 'size-2 shrink-0 rotate-45 border-r-2 border-b-2 border-muted transition-transform'
