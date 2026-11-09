import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { BUTTON_VARIANT_CLASSES } from './buttonVariants.ts'

interface ButtonLinkProps {
  to: string
  variant?: 'primary' | 'ghost'
  block?: boolean
  children: ReactNode
}

// 버튼 모양의 링크. 화면 이동에 쓴다
export default function ButtonLink({ to, variant = 'primary', block = false, children }: ButtonLinkProps) {
  const classes = [
    'flex min-h-11 items-center justify-center rounded-xl px-4',
    BUTTON_VARIANT_CLASSES[variant],
    block ? 'w-full' : '',
  ]
  return (
    <Link to={to} className={classes.filter(Boolean).join(' ')}>
      {children}
    </Link>
  )
}
