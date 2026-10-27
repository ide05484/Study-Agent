import { Link } from 'react-router'
import StudyHeatmap from '../components/dashboard/StudyHeatmap.tsx'
import SubjectProgressList from '../components/dashboard/SubjectProgressList.tsx'
import { useDashboard } from '../hooks/useDashboard.ts'
import { SUBJECT_LABELS } from '../libs/subjects.ts'

// 현재 공부상태: 공부 잔디 → 연속 공부 → 이번주 목표량 → 과목별 진도율
// TODO: 모의고사 점수 추이
export default function DashboardPage() {
  const { data, error } = useDashboard()

  if (error) return <p className="status-text error-text">{error}</p>
  if (!data) return <p className="status-text">불러오는 중…</p>

  return (
    <div className="page">
      <section className="card">
        <StudyHeatmap days={data.heat} />
      </section>

      <p className="streak">
        {data.streak > 0 ? `🔥 ${data.streak}일 연속 공부 버닝중!` : '오늘부터 다시 시작해봐요'}
      </p>

      <Link to="/settings" className="card card-link">
        <span className="card-title">
          이번주 목표량
          <span className="chevron chevron--right" aria-hidden="true" />
        </span>
        {data.weekly.length > 0 ? (
          <>
            <span>{data.weekly.map((goal) => `${SUBJECT_LABELS[goal.subject]} ${goal.pages}p`).join(' · ')}</span>
            <span className="muted">
              완료 {data.weeklyDone}/{data.weeklyTotal}
            </span>
          </>
        ) : (
          <span className="muted">이번주 계획이 아직 없어요.</span>
        )}
      </Link>

      <section>
        <h2 className="section-title">과목별 진도율</h2>
        <SubjectProgressList items={data.subjects} />
      </section>
    </div>
  )
}
