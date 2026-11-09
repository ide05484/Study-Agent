import type { InputHTMLAttributes } from 'react'

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {}

export default function TextField(props: TextFieldProps) {
  return (
    <input {...props} className="min-h-11 w-full rounded-xl border border-line bg-bg px-3 py-2 disabled:opacity-60" />
  )
}
