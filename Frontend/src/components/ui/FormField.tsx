import { useEffect, useRef, type ReactNode } from 'react'

interface FormFieldProps {
  label: string
  htmlFor?: string // 입력 칸 id. 칩·목표일 줄처럼 여러 칸을 묶을 때는 비운다
  required?: boolean // 라벨 옆에 붉은 * 를 단다
  error?: string | null // 라벨 옆 붉은 글씨. 없으면 숨긴다
  shake?: number // 값이 바뀔 때 오류가 있으면 입력을 좌우로 흔든다(제출할 때마다 1씩 올린다)
  children: ReactNode
}

const SHAKE_FRAMES: Keyframe[] = [
  { transform: 'translateX(0)' },
  { transform: 'translateX(-6px)' },
  { transform: 'translateX(6px)' },
  { transform: 'translateX(-4px)' },
  { transform: 'translateX(4px)' },
  { transform: 'translateX(0)' },
]

// 폼의 한 항목: 라벨 줄(라벨, 필수 *, 오류 문구) 아래에 입력. 구글 폼처럼 빠진 칸은 제출할 때 알려 준다
export default function FormField({
  label,
  htmlFor,
  required = false,
  error = null,
  shake = 0,
  children,
}: FormFieldProps) {
  const bodyRef = useRef<HTMLDivElement>(null)
  // 입력하는 동안 오류 문구가 바뀌어도 흔들지 않도록, shake 값이 바뀐 때(제출)만 흔든다
  const lastShakeRef = useRef(shake)

  useEffect(() => {
    if (shake === lastShakeRef.current) return
    lastShakeRef.current = shake
    if (!error || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    bodyRef.current?.animate(SHAKE_FRAMES, { duration: 320, easing: 'ease-in-out' })
  }, [shake, error])

  const labelContent = (
    <>
      {label}
      {required && (
        <>
          <span className="text-danger" aria-hidden="true">
            {' '}
            *
          </span>
          <span className="sr-only">(필수)</span>
        </>
      )}
    </>
  )

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-baseline gap-x-2">
        {htmlFor ? (
          <label className="text-sm font-semibold" htmlFor={htmlFor}>
            {labelContent}
          </label>
        ) : (
          <p className="text-sm font-semibold">{labelContent}</p>
        )}
        {error && (
          <span className="text-xs text-danger" role="alert">
            {error}
          </span>
        )}
      </div>
      <div ref={bodyRef}>{children}</div>
    </div>
  )
}
