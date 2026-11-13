import type { TextareaHTMLAttributes } from 'react'
import { FIELD_CLASS } from './fieldClasses.ts'

interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {}

export default function TextArea(props: TextAreaProps) {
  return <textarea {...props} className={FIELD_CLASS} />
}
