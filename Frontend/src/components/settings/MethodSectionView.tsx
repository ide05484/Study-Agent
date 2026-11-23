import type { StudyMethodSection } from '../../interfaces/studyMethod.ts'
import MarkedText from './MarkedText.tsx'

interface MethodSectionViewProps {
  section: StudyMethodSection
}

// 공부법 소제목 하나: 점 목록(list) 또는 이름·설명 정의 목록(pairs, 폰 폭에서도 좁아지지 않게 세로로 쌓는다)
export default function MethodSectionView({ section }: MethodSectionViewProps) {
  return (
    <section className="grid gap-2">
      <h3 className="text-sm font-semibold">{section.heading}</h3>
      {section.kind === 'list' ? (
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {section.items.map((item) => (
            <li key={item}>
              <MarkedText text={item} />
            </li>
          ))}
        </ul>
      ) : (
        <dl className="space-y-2 text-sm">
          {section.items.map((pair) => (
            <div key={pair.label}>
              <dt className="font-semibold">
                <MarkedText text={pair.label} />
              </dt>
              <dd className="text-muted">
                <MarkedText text={pair.text} />
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}
