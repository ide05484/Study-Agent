import type { Subject } from './subject.ts'

export interface Book {
  id: string
  subject: Subject
  title: string
  total_pages: number
  current_page: number
}

export type TaskStatus = 'pending' | 'done' | 'partial' | 'skipped'

export interface DailyTask {
  id: string
  book_id: string
  task_date: string
  start_page: number
  end_page: number
  status: TaskStatus
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
