import type { ExamKind, MockExam, MockExamScore } from '../interfaces/mockExam.ts'
import type { Subject } from '../interfaces/subject.ts'
import { SUBJECT_LABELS, SUBJECTS } from './subjects.ts'

export const EXAM_KIND_LABELS: Record<ExamKind, string> = { mock: '모의고사', official: '실제 시험' }

// 입력 칸 문자열이 0~100의 숫자인지. 소수는 둘째 자리까지, 지수·16진 표기와 빈 칸은 false
export function isScoreText(text: string): boolean {
  const trimmed = text.trim()
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(trimmed)) return false
  return Number(trimmed) <= 100
}

export interface SubjectScore {
  subject: Subject
  label: string
  score: number | null // 넣지 않은 과목은 null
}

// 과목 순서대로 4과목을 모두 돌려준다(블록의 표 줄을 맞추려고 빈 과목도 둔다)
export function subjectScores(scores: MockExamScore[]): SubjectScore[] {
  return SUBJECTS.map((subject) => ({
    subject,
    label: SUBJECT_LABELS[subject],
    score: scores.find((s) => s.subject === subject)?.score ?? null,
  }))
}

export interface TrendPoint {
  id: string
  name: string
  kind: ExamKind
  taken_on: string
  score: number
}

// 그 과목 점수가 있는 시험만 응시일 오래된 순으로(같은 날은 넘겨받은 순서를 뒤집어 먼저 넣은 시험이 앞)
export function scoreTrend(exams: MockExam[], subject: Subject): TrendPoint[] {
  const points: TrendPoint[] = []
  for (const exam of exams) {
    const score = exam.scores.find((s) => s.subject === subject)?.score
    if (score === undefined) continue
    points.push({ id: exam.id, name: exam.name, kind: exam.kind, taken_on: exam.taken_on, score })
  }
  // exams는 최신순(응시일, 등록일 내림차순)이므로 뒤집은 뒤 응시일로 안정 정렬한다
  return points.reverse().sort((a, b) => a.taken_on.localeCompare(b.taken_on))
}

// 넣은 과목만 더한 총점과 만점(과목 수 × 100). 소수는 둘째 자리까지
export function examTotal(scores: MockExamScore[]): { total: number; max: number } {
  const total = scores.reduce((sum, s) => sum + s.score, 0)
  return { total: Math.round(total * 100) / 100, max: scores.length * 100 }
}
