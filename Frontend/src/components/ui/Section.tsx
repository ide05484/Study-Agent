import type { ReactNode } from 'react'

interface SectionProps {
  title?: string
  children: ReactNode
}

// 화면 안의 영역은 카드 대신 플래너처럼 괘선으로 나눈다
export default function Section({ title, children }: SectionProps) {
  return (
    <section className="border-b border-line py-5 last:border-b-0">
      {title && <h2 className="mb-3 text-[15px] font-bold">{title}</h2>}
      {children}
    </section>
  )
}
