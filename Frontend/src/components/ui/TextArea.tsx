import type { TextareaHTMLAttributes } from 'react'

interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {}

export default function TextArea(props: TextAreaProps) {
  return (
    <textarea
      {...props}
      className="min-h-11 w-full rounded-xl border border-line bg-bg px-3 py-2 disabled:opacity-60"
    />
  )
}
