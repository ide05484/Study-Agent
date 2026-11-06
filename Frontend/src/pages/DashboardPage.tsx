import { Link } from 'react-router'
import StudyHeatmap from '../components/dashboard/StudyHeatmap.tsx'
import SubjectProgressList from '../components/dashboard/SubjectProgressList.tsx'
import { chevronClass, sectionClass, sectionTitleClass } from '../components/ui/classes.ts'
import { useDashboard } from '../hooks/useDashboard.ts'
import { SUBJECT_LABELS } from '../libs/subjects.ts'

// 현재 공부상태: 공부 잔디 → 연속 공부 → 이번주 목표량 → 과목별 진도율 (영역은 괘선으로 구분)
// TODO: 모의고사 점수 추이
export default function DashboardPage() {
  const { data, error } = useDashboard()

  if (error) return <p className="p-4 text-center text-danger">{error}</p>
  if (!data) return <p className="p-4 text-center text-muted">불러오는 중…</p>

  return (
    <div className="px-4">
      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>공부 잔디</h2>
        <StudyHeatmap days={data.heat} />
      </section>

      <section className={sectionClass}>
        {data.streak > 0 ? (
          <p className="flex items-baseline gap-1">
            <span className="text-[34px] leading-none font-bold tabular-nums">{data.streak}</span>
            <span className="font-bold">일 연속 공부 버닝중! 🔥</span>
          </p>
        ) : (
          <p className="font-bold">오늘 기록을 남기면 연속 공부가 시작돼요.</p>
        )}
      </section>

      <section className={sectionClass}>
        <Link to="/settings" className="mb-3 flex min-h-11 items-center justify-between">
          <h2 className="text-[15px] font-bold">이번주 목표량</h2>
          <span className={`${chevronClass} -rotate-45`} aria-hidden="true" />
        </Link>
        {data.weekly.length > 0 ? (
          <>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
              {data.weekly.map((goal) => (
                <li key={goal.subject} className="flex justify-between">
                  <span className="text-muted">{SUBJECT_LABELS[goal.subject]}</span>
                  <span className="tabular-nums">{goal.pages}쪽</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-muted">
              이번 주 계획 {data.weeklyTotal}개 중 {data.weeklyDone}개 완료
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">이번 주 계획이 없어요. 공부 설정에서 시험일과 교재를 등록하세요.</p>
        )}
      </section>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>과목별 진도율</h2>
        <SubjectProgressList items={data.subjects} />
      </section>
    </div>
  )
}
