import type { ReactNode } from 'react'
import Chevron from './Chevron.tsx'

interface DisclosureProps {
  summary: ReactNode
  children: ReactNode
}

// 네이티브 details로 만든 펼침 영역. 열리면 꺾쇠가 위로 돈다
export default function Disclosure({ summary, children }: DisclosureProps) {
  return (
    <details className="group">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between font-semibold [&::-webkit-details-marker]:hidden">
        {summary}
        <Chevron className="group-open:-rotate-135" />
      </summary>
      {children}
    </details>
  )
}
