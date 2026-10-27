import type { HeatDay } from '../../hooks/useDashboard.ts'
import { formatDateTitle } from '../../libs/date.ts'

const LEVEL_LABELS = ['기록 없음', '조금', '절반 가까이', '절반 이상', '계획 달성'] as const

// GitHub 잔디처럼 하루 한 칸. 세로 7칸(월~일) × 가로 주 단위, 달성률에 따라 --heat-0~4
export default function StudyHeatmap({ days }: { days: HeatDay[] }) {
  return (
    <div className="heatmap">
      <div className="heatmap-grid" role="img" aria-label="최근 공부 기록 잔디">
        {days.map((day) => (
          <span
            key={day.date}
            className={`heatmap-cell${day.level === null ? ' is-future' : ''}`}
            style={day.level === null ? undefined : { background: `var(--heat-${day.level})` }}
            title={day.level === null ? undefined : `${formatDateTitle(day.date)} · ${LEVEL_LABELS[day.level]}`}
          />
        ))}
      </div>
      <div className="heatmap-legend" aria-hidden="true">
        적음
        {LEVEL_LABELS.map((_, level) => (
          <span key={level} className="heatmap-cell" style={{ background: `var(--heat-${level})` }} />
        ))}
        많음
      </div>
    </div>
  )
}
