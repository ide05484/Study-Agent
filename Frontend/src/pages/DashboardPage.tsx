import { Link } from 'react-router'
import StudyHeatmap from '../components/dashboard/StudyHeatmap.tsx'
import SubjectProgressList from '../components/dashboard/SubjectProgressList.tsx'
import { cardClass, chevronClass, sectionTitleClass } from '../components/ui/classes.ts'
import { useDashboard } from '../hooks/useDashboard.ts'
import { SUBJECT_LABELS } from '../libs/subjects.ts'

// 현재 공부상태: 공부 잔디 → 연속 공부 → 이번주 목표량 → 과목별 진도율
// TODO: 모의고사 점수 추이
export default function DashboardPage() {
  const { data, error } = useDashboard()

  if (error) return <p className="p-4 text-center text-danger">{error}</p>
  if (!data) return <p className="p-4 text-center text-muted">불러오는 중…</p>

  return (
    <div className="flex flex-col gap-4 p-4">
      <section className={cardClass}>
        <StudyHeatmap days={data.heat} />
      </section>

      <p className="text-center font-bold">
        {data.streak > 0 ? `🔥 ${data.streak}일 연속 공부 버닝중!` : '오늘부터 다시 시작해봐요'}
      </p>

      <Link to="/settings" className={`${cardClass} flex flex-col gap-1`}>
        <span className="flex items-center justify-between font-bold">
          이번주 목표량
          <span className={`${chevronClass} -rotate-45`} aria-hidden="true" />
        </span>
        {data.weekly.length > 0 ? (
          <>
            <span>{data.weekly.map((goal) => `${SUBJECT_LABELS[goal.subject]} ${goal.pages}p`).join(' · ')}</span>
            <span className="text-sm text-muted">
              완료 {data.weeklyDone}/{data.weeklyTotal}
            </span>
          </>
        ) : (
          <span className="text-sm text-muted">이번주 계획이 아직 없어요.</span>
        )}
      </Link>

      <section>
        <h2 className={sectionTitleClass}>과목별 진도율</h2>
        <SubjectProgressList items={data.subjects} />
      </section>
    </div>
  )
}
