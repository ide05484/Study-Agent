import type { InputHTMLAttributes } from 'react'
import { FIELD_CLASS } from './fieldClasses.ts'

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {}

export default function TextField(props: TextFieldProps) {
  return <input {...props} className={FIELD_CLASS} />
}
