import type { Subject } from './subject.ts'

// mock: 모의고사, official: 실제 시험(지방직 등)
export type ExamKind = 'mock' | 'official'

export interface MockExamScore {
  subject: Subject
  score: number
}

export interface MockExam {
  id: string
  kind: ExamKind
  name: string
  taken_on: string
  scores: MockExamScore[]
}

export interface NewMockExam {
  kind: ExamKind
  name: string
  taken_on: string
  scores: MockExamScore[]
}
