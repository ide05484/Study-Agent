import type { ButtonHTMLAttributes } from 'react'

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  type: 'button' | 'submit'
  variant?: 'primary' | 'ghost'
  block?: boolean
}

// Tailwind가 소스에서 찾을 수 있도록 전체 클래스 이름을 적는다
const VARIANT_CLASSES = {
  primary: 'bg-accent font-semibold text-on-accent',
  ghost: 'border border-line bg-bg text-fg',
} as const

// 기본 버튼. 주황 채움(primary)과 테두리(ghost) 두 가지다
export default function Button({ variant = 'primary', block = false, className, ...rest }: ButtonProps) {
  const classes = [
    'min-h-11 rounded-xl px-4 disabled:opacity-50',
    VARIANT_CLASSES[variant],
    block ? 'w-full' : '',
    className ?? '',
  ]
  return <button {...rest} className={classes.filter(Boolean).join(' ')} />
}
