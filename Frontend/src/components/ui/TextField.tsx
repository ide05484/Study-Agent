import type { InputHTMLAttributes } from 'react'
import { FIELD_CLASS, FIELD_INVALID_CLASS } from './fieldClasses.ts'

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  invalid?: boolean // 오류가 있으면 테두리를 danger로, aria-invalid를 단다
  suffix?: string // 칸 오른쪽에 붙는 단위 (예: 회독, 회차)
}

export default function TextField({ invalid = false, suffix, ...props }: TextFieldProps) {
  const input = (
    <input {...props} aria-invalid={invalid || undefined} className={invalid ? FIELD_INVALID_CLASS : FIELD_CLASS} />
  )
  if (!suffix) return input
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">{input}</div>
      <span className="shrink-0 text-muted">{suffix}</span>
    </div>
  )
}
