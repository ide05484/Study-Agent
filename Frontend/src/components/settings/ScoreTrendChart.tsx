import { useEffect, useRef, useState } from 'react'
import type { ExamKind, MockExam } from '../../interfaces/mockExam.ts'
import type { Subject } from '../../interfaces/subject.ts'
import { formatFullDate, formatShortDate } from '../../libs/date.ts'
import { EXAM_KIND_LABELS, scoreTrend } from '../../libs/exams.ts'
import { SUBJECT_LABELS } from '../../libs/subjects.ts'
import Notice from '../ui/Notice.tsx'

interface ScoreTrendChartProps {
  exams: MockExam[]
  subject: Subject
}

const HEIGHT = 200
const PAD = { top: 28, right: 24, bottom: 28, left: 32 }
const Y_TICKS = [0, 50, 100]
// 날짜 라벨(26.10.9, 약 40px)과 점수 라벨(84.55, 약 34px)이 겹치지 않는 점 사이 간격. 좁으면 첫·끝만 쓴다
const MIN_DATE_LABEL_GAP = 48
const MIN_SCORE_LABEL_GAP = 40
const DOT_RADIUS = 5
const HIT_RADIUS = 14

// 모의고사는 채운 점, 실제 시험은 속이 빈 점. 점 둘레에 바탕색(또는 accent) 2px 테두리
const DOT_CLASS: Record<ExamKind, string> = {
  mock: 'fill-accent stroke-bg',
  official: 'fill-bg stroke-accent',
}

// 한 과목의 점수 변화를 응시일 순 꺾은선으로 보여 준다. y축 0~100, 점 위에 점수
export default function ScoreTrendChart({ exams, subject }: ScoreTrendChartProps) {
  const points = scoreTrend(exams, subject)
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  // 글자 크기를 그대로 두려고 viewBox를 늘리지 않고 실제 폭으로 그린다
  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const count = points.length
  const plotWidth = Math.max(width - PAD.left - PAD.right, 0)
  const plotHeight = HEIGHT - PAD.top - PAD.bottom
  const gap = count > 1 ? plotWidth / (count - 1) : Infinity
  // 점이 촘촘하면 투명 영역이 옆 점을 가리지 않도록 간격의 절반까지만 넓힌다
  const hitRadius = Math.max(Math.min(HIT_RADIUS, gap / 2), DOT_RADIUS)
  function xAt(i: number): number {
    return count === 1 ? PAD.left + plotWidth / 2 : PAD.left + gap * i
  }
  function yAt(score: number): number {
    return PAD.top + plotHeight * (1 - score / 100)
  }
  function isEdge(i: number): boolean {
    return i === 0 || i === count - 1
  }
  const kinds = (['mock', 'official'] as const).filter((kind) => points.some((p) => p.kind === kind))

  return (
    <div ref={containerRef}>
      {count === 0 && <Notice>이 과목 점수가 아직 없어요.</Notice>}
      {/* 폭을 재기 전에도 자리를 잡아 두어 그래프가 나타날 때 아래 내용이 밀리지 않게 한다 */}
      {count > 0 && width === 0 && <div className="h-50" />}

      {count > 0 && width > 0 && (
        <svg width={width} height={HEIGHT} className="block" aria-hidden="true">
          {Y_TICKS.map((tick) => (
            <g key={tick}>
              <line
                className="stroke-line"
                x1={PAD.left}
                x2={width - PAD.right}
                y1={yAt(tick)}
                y2={yAt(tick)}
                strokeWidth={1}
              />
              <text
                className="fill-muted text-xs tabular-nums"
                x={PAD.left - 8}
                y={yAt(tick)}
                textAnchor="end"
                dominantBaseline="middle"
              >
                {tick}
              </text>
            </g>
          ))}

          {count > 1 && (
            <polyline
              className="stroke-accent"
              fill="none"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              points={points.map((p, i) => `${xAt(i)},${yAt(p.score)}`).join(' ')}
            />
          )}

          {points.map((point, i) => (
            <g key={point.id}>
              <title>{`${formatFullDate(point.taken_on)} ${EXAM_KIND_LABELS[point.kind]} ${point.name}: ${point.score}점`}</title>
              {/* 점보다 넓은 투명 영역으로 마우스를 올리기 쉽게 한다 */}
              <circle cx={xAt(i)} cy={yAt(point.score)} r={hitRadius} fill="transparent" />
              <circle
                className={DOT_CLASS[point.kind]}
                cx={xAt(i)}
                cy={yAt(point.score)}
                r={DOT_RADIUS}
                strokeWidth={2}
              />
              {(gap >= MIN_SCORE_LABEL_GAP || isEdge(i)) && (
                <text
                  className="fill-fg text-xs font-semibold tabular-nums"
                  x={xAt(i)}
                  y={yAt(point.score) - DOT_RADIUS - 6}
                  textAnchor="middle"
                >
                  {point.score}
                </text>
              )}
              {(gap >= MIN_DATE_LABEL_GAP || isEdge(i)) && (
                <text className="fill-muted text-xs tabular-nums" x={xAt(i)} y={HEIGHT - 8} textAnchor="middle">
                  {formatShortDate(point.taken_on)}
                </text>
              )}
            </g>
          ))}
        </svg>
      )}

      {count > 0 && (
        <>
          <ul className="mt-1 flex justify-center gap-4 text-xs text-muted">
            {kinds.map((kind) => (
              <li key={kind} className="flex items-center gap-1">
                <svg className="size-3" viewBox="0 0 12 12" aria-hidden="true">
                  <circle className={DOT_CLASS[kind]} cx={6} cy={6} r={4} strokeWidth={2} />
                </svg>
                {EXAM_KIND_LABELS[kind]}
              </li>
            ))}
          </ul>
          {count === 1 && (
            <div className="mt-2">
              <Notice>점수가 쌓이면 변화가 선으로 보여요.</Notice>
            </div>
          )}
          {/* 그래프는 화면 낭독기에서 숨기고 같은 내용을 목록으로 읽어 준다 */}
          <ul className="sr-only" aria-label={`${SUBJECT_LABELS[subject]} 점수 추이`}>
            {points.map((point) => (
              <li key={point.id}>
                {`${formatFullDate(point.taken_on)} ${EXAM_KIND_LABELS[point.kind]} ${point.name}: ${point.score}점`}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
