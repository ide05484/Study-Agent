import type { Book, BookPlanUpdate, DailyTaskWithBook, NewBook } from '../interfaces/study.ts'
import { requireUserId, supabase } from '../libs/supabase.ts'

const BOOK_COLUMNS =
  'id, subject, title, total_units, current_unit, unit, target_rounds, current_round, daily_amount, round_targets'

// round_targets(date[])는 원소로 null(목표일 없음)을 담는데, 생성된 DB 타입은 string[]로만 본다.
// 보내는 값은 그대로 두고 타입만 맞춘다
function toBookRow<T extends { round_targets: (string | null)[] }>(input: T): T & { round_targets: string[] } {
  return input as T & { round_targets: string[] }
}

export async function fetchBooks(): Promise<Book[]> {
  const { data, error } = await supabase.from('books').select(BOOK_COLUMNS).order('created_at', { ascending: true })
  if (error) throw error
  return data as Book[]
}

export async function addBook(input: NewBook): Promise<Book> {
  const user_id = await requireUserId()
  const { data, error } = await supabase
    .from('books')
    .insert({ ...toBookRow(input), user_id })
    .select(BOOK_COLUMNS)
    .single()
  if (error) throw error
  return data as Book
}

export async function updateBook(id: string, input: BookPlanUpdate): Promise<Book> {
  const { data, error } = await supabase
    .from('books')
    .update(toBookRow(input))
    .eq('id', id)
    .select(BOOK_COLUMNS)
    .single()
  if (error) throw error
  return data as Book
}

// 여러 권을 한 번에 지운다. 그 교재의 계획(daily_tasks)은 on delete cascade로 같이 지워진다
export async function deleteBooks(ids: string[]): Promise<void> {
  const { error } = await supabase.from('books').delete().in('id', ids)
  if (error) throw error
}

// from ~ to (양 끝 포함) 기간의 일별 계획
export async function fetchDailyTasks(from: string, to: string): Promise<DailyTaskWithBook[]> {
  const { data, error } = await supabase
    .from('daily_tasks')
    .select(
      'id, book_id, task_date, start_unit, end_unit, round, status, book:books(subject, title, unit, target_rounds)',
    )
    .gte('task_date', from)
    .lte('task_date', to)
  if (error) throw error
  return data as DailyTaskWithBook[]
}

// 학습 기록이 있는 날짜 목록
export async function fetchStudyDates(): Promise<string[]> {
  const { data, error } = await supabase
    .from('study_logs')
    .select('study_date')
    .order('study_date', { ascending: false })
  if (error) throw error
  return [...new Set((data as { study_date: string }[]).map((row) => row.study_date))]
}
