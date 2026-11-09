import type { SelectHTMLAttributes } from 'react'
import { FIELD_CLASS } from './fieldClasses.ts'

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> {}

export default function Select(props: SelectProps) {
  return <select {...props} className={FIELD_CLASS} />
}
