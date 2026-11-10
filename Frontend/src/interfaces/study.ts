import type { Subject } from './subject.ts'

// 교재 분량 단위. 단어장처럼 Day로 나뉜 교재는 'day'
export type BookUnit = 'page' | 'day'

// total_pages·current_page는 unit 단위의 분량이다(Day 교재면 Day 수)
export interface Book {
  id: string
  subject: Subject
  title: string
  total_pages: number
  current_page: number
  unit: BookUnit
  target_rounds: number
  current_round: number
  // null이면 시험 전날까지 고르게 나눈다
  daily_amount: number | null
}

export type NewBook = Pick<Book, 'subject' | 'title' | 'total_pages'> &
  Partial<Pick<Book, 'unit' | 'target_rounds' | 'daily_amount'>>

// 진도 수정: "몇 회독째 + 그 회독에서 어디까지"와 목표 회독
export type BookProgress = Pick<Book, 'current_round' | 'current_page' | 'target_rounds'>

export type TaskStatus = 'pending' | 'done' | 'partial' | 'skipped'

export interface DailyTask {
  id: string
  book_id: string
  task_date: string
  start_page: number
  end_page: number
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
  start_page: number | null
  end_page: number | null
  questions_solved: number | null
  questions_wrong: number | null
}
