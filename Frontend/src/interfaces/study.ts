import type { Subject } from './subject.ts'

// 교재 분량 단위. 단어장은 Day, 챕터로 나뉜 교재는 chapter, 인강·모의고사 회차는 session
export type BookUnit = 'day' | 'chapter' | 'session'

// total_units·current_unit는 unit 단위의 분량이다(Day·챕터·회차 수)
export interface Book {
  id: string
  subject: Subject
  title: string
  total_units: number
  current_unit: number
  unit: BookUnit
  target_rounds: number
  current_round: number
  // 하루 최소 분량. null이면 목표일(없으면 시험 전날)까지 고르게 나눈다
  daily_amount: number | null
  // 회독별 목표일(YYYY-MM-DD). n번째 값이 n회독 목표일, null은 목표일 없음
  round_targets: (string | null)[]
}

export type NewBook = Pick<
  Book,
  'subject' | 'title' | 'unit' | 'total_units' | 'target_rounds' | 'daily_amount' | 'round_targets'
>

// 수정: 진도("몇 회독째 + 그 회독에서 어디까지")와 계획 설정(목표 회독, 최소 분량, 회독별 목표일)
export type BookPlanUpdate = Pick<
  Book,
  'current_round' | 'current_unit' | 'target_rounds' | 'daily_amount' | 'round_targets'
>

export type TaskStatus = 'pending' | 'done' | 'partial' | 'skipped'

export interface DailyTask {
  id: string
  book_id: string
  task_date: string
  start_unit: number
  end_unit: number
  // 이 범위가 몇 회독째인지
  round: number
  status: TaskStatus
}

// daily_tasks + books 조인 결과
export interface DailyTaskWithBook extends DailyTask {
  book: Pick<Book, 'subject' | 'title' | 'unit' | 'target_rounds'>
}

export interface StudyLog {
  id: string
  book_id: string | null
  subject: Subject
  study_date: string
  start_unit: number | null
  end_unit: number | null
  questions_solved: number | null
  questions_wrong: number | null
}
