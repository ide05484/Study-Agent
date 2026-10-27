import type { Subject } from './subject.ts'

export interface Book {
  id: string
  subject: Subject
  title: string
  total_pages: number
  current_page: number
}

// 교재 분량은 페이지 기준. 회차·Chapter 단위는 교재 DB를 쌓은 뒤 도입한다
export type NewBook = Pick<Book, 'subject' | 'title' | 'total_pages'>

export type TaskStatus = 'pending' | 'done' | 'partial' | 'skipped'

export interface DailyTask {
  id: string
  book_id: string
  task_date: string
  start_page: number
  end_page: number
  status: TaskStatus
}

// daily_tasks + books 조인 결과
export interface DailyTaskWithBook extends DailyTask {
  book: Pick<Book, 'subject' | 'title'>
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
