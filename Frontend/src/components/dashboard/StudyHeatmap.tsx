import type { HeatDay, HeatLevel } from '../../hooks/useDashboard.ts'
import { formatMonthDay } from '../../libs/date.ts'
import { formatMinutes } from '../../libs/studyTime.ts'

// Tailwind가 클래스를 찾을 수 있도록 단계별 클래스를 그대로 적는다
const LEVEL_CLASSES: Record<HeatLevel, string> = {
  0: 'bg-heat-0',
  1: 'bg-heat-1',
  2: 'bg-heat-2',
  3: 'bg-heat-3',
  4: 'bg-heat-4',
}

const LEVELS: HeatLevel[] = [0, 1, 2, 3, 4]

function dayLabel(day: HeatDay): string | undefined {
  const date = formatMonthDay(day.date)
  switch (day.kind) {
    case 'future':
      return undefined
    case 'time':
      return `${date} · 순공 ${formatMinutes(day.minutes)}`
    case 'dot':
      return day.percent === null
        ? `${date} · 순공시간 안 적음, 공부 기록 있음`
        : `${date} · 순공시간 안 적음, 분량 ${day.percent}%`
    case 'empty':
      return `${date} · 기록 없음`
  }
}

interface HeatCellProps {
  day: HeatDay
}

function HeatCell({ day }: HeatCellProps) {
  const label = dayLabel(day)
  const colorClass = day.kind === 'future' ? '' : day.kind === 'time' ? LEVEL_CLASSES[day.level] : LEVEL_CLASSES[0]
  return (
    <span
      className={`flex aspect-square items-center justify-center rounded-[3px] ${colorClass}`}
      title={label}
      aria-label={label}
    >
      {day.kind === 'dot' && <span className="size-[40%] rounded-full bg-accent" aria-hidden="true" />}
    </span>
  )
}

interface StudyHeatmapProps {
  days: HeatDay[]
}

// GitHub 잔디처럼 하루 한 칸. 세로 7칸(월~일) × 가로 주 단위, 순공시간에 따라 heat-1~4.
// 순공시간을 안 적은 날은 heat-0 칸에 점(분량 진행 또는 공부 기록이 있는 날)
export default function StudyHeatmap({ days }: StudyHeatmapProps) {
  return (
    <div>
      <div
        className="grid auto-cols-fr grid-flow-col grid-rows-7 gap-[3px]"
        role="group"
        aria-label="최근 공부 기록 잔디"
      >
        {days.map((day) => (
          <HeatCell key={day.date} day={day} />
        ))}
      </div>
      <div className="mt-2 flex flex-col items-end gap-1 text-xs text-muted" aria-hidden="true">
        <div className="flex items-center gap-[3px]">
          적음
          {LEVELS.map((level) => (
            <span key={level} className={`size-2.5 rounded-[3px] ${LEVEL_CLASSES[level]}`} />
          ))}
          많음
        </div>
        <div className="flex items-center gap-1.5">
          <span className="flex size-2.5 items-center justify-center rounded-[3px] bg-heat-0">
            <span className="size-1 rounded-full bg-accent" />
          </span>
          순공시간 안 적은 날
        </div>
      </div>
    </div>
  )
}
