import type { Subject } from './subject.ts'

export interface MockExamScore {
  subject: Subject
  score: number
}

export interface MockExam {
  id: string
  name: string
  taken_on: string
  scores: MockExamScore[]
}
