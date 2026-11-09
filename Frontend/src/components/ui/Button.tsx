import type { ButtonHTMLAttributes } from 'react'
import { BUTTON_VARIANT_CLASSES } from './buttonVariants.ts'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  type: 'button' | 'submit'
  variant?: 'primary' | 'ghost'
  block?: boolean
}

// 기본 버튼. 주황 채움(primary)과 테두리(ghost) 두 가지다
export default function Button({ variant = 'primary', block = false, className, ...rest }: ButtonProps) {
  const classes = [
    'min-h-11 rounded-xl px-4 disabled:opacity-50',
    BUTTON_VARIANT_CLASSES[variant],
    block ? 'w-full' : '',
    className ?? '',
  ]
  return <button {...rest} className={classes.filter(Boolean).join(' ')} />
}
