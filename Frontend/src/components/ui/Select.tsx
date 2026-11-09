import type { SelectHTMLAttributes } from 'react'

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> {}

export default function Select(props: SelectProps) {
  return (
    <select {...props} className="min-h-11 w-full rounded-xl border border-line bg-bg px-3 py-2 disabled:opacity-60" />
  )
}
