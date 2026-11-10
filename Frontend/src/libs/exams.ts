import type { ExamKind, MockExamScore } from '../interfaces/mockExam.ts'
import { SUBJECT_LABELS, SUBJECTS } from './subjects.ts'

export const EXAM_KIND_LABELS: Record<ExamKind, string> = { mock: '모의고사', official: '실제 시험' }

// 입력 칸 문자열이 0~100의 숫자인지(소수 허용, 빈 칸은 false)
export function isScoreText(text: string): boolean {
  const value = Number(text)
  return text.trim() !== '' && Number.isFinite(value) && value >= 0 && value <= 100
}

// 국어 84 · 영어 52처럼 과목 순서대로 잇는다. 점수가 없는 과목은 뺀다
export function scoresLabel(scores: MockExamScore[]): string {
  return SUBJECTS.flatMap((subject) => {
    const found = scores.find((s) => s.subject === subject)
    return found ? [`${SUBJECT_LABELS[subject]} ${found.score}`] : []
  }).join(' · ')
}
