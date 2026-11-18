import type { ReactNode } from 'react'

interface SectionProps {
  title?: string
  action?: ReactNode // 제목 줄 오른쪽 끝 (예: Menu). title이 있을 때만 보인다
  children: ReactNode
}

// 화면 안의 영역은 카드 대신 플래너처럼 괘선으로 나눈다
export default function Section({ title, action, children }: SectionProps) {
  return (
    <section className="border-b border-line py-5 last:border-b-0">
      {title && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-bold">{title}</h2>
          {/* 44px 버튼이 제목 줄 높이를 늘리지 않도록 위아래로 겹친다 */}
          {action && <div className="-my-3 shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  )
}
