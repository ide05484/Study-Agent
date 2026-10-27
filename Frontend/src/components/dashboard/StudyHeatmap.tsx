import type { HeatDay, HeatLevel } from '../../hooks/useDashboard.ts'
import { formatDateTitle } from '../../libs/date.ts'

const LEVEL_LABELS = ['기록 없음', '조금', '절반 가까이', '절반 이상', '계획 달성'] as const

// Tailwind가 클래스를 찾을 수 있도록 단계별 클래스를 그대로 적는다
const LEVEL_CLASSES: Record<HeatLevel, string> = {
  0: 'bg-heat-0',
  1: 'bg-heat-1',
  2: 'bg-heat-2',
  3: 'bg-heat-3',
  4: 'bg-heat-4',
}

const LEVELS: HeatLevel[] = [0, 1, 2, 3, 4]

// GitHub 잔디처럼 하루 한 칸. 세로 7칸(월~일) × 가로 주 단위, 달성률에 따라 heat-0~4
export default function StudyHeatmap({ days }: { days: HeatDay[] }) {
  return (
    <div>
      <div
        className="grid auto-cols-fr grid-flow-col grid-rows-7 gap-[3px]"
        role="img"
        aria-label="최근 공부 기록 잔디"
      >
        {days.map((day) => (
          <span
            key={day.date}
            className={`aspect-square rounded-[3px] ${day.level === null ? '' : LEVEL_CLASSES[day.level]}`}
            title={day.level === null ? undefined : `${formatDateTitle(day.date)} · ${LEVEL_LABELS[day.level]}`}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-end gap-[3px] text-xs text-muted" aria-hidden="true">
        적음
        {LEVELS.map((level) => (
          <span key={level} className={`size-2.5 rounded-[3px] ${LEVEL_CLASSES[level]}`} />
        ))}
        많음
      </div>
    </div>
  )
}
