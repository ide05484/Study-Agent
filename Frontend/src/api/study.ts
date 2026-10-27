import type { Book, DailyTaskWithBook, NewBook } from '../interfaces/study.ts'
import { requireUserId, supabase } from '../libs/supabase.ts'

export async function fetchBooks(): Promise<Book[]> {
  const { data, error } = await supabase
    .from('books')
    .select('id, subject, title, total_pages, current_page')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as Book[]
}

export async function addBook(input: NewBook): Promise<Book> {
  const user_id = await requireUserId()
  const { data, error } = await supabase
    .from('books')
    .insert({ ...input, user_id })
    .select('id, subject, title, total_pages, current_page')
    .single()
  if (error) throw error
  return data as Book
}

export async function deleteBook(id: string): Promise<void> {
  const { error } = await supabase.from('books').delete().eq('id', id)
  if (error) throw error
}

// from ~ to (양 끝 포함) 기간의 일별 계획
export async function fetchDailyTasks(from: string, to: string): Promise<DailyTaskWithBook[]> {
  const { data, error } = await supabase
    .from('daily_tasks')
    .select('id, book_id, task_date, start_page, end_page, status, book:books(subject, title)')
    .gte('task_date', from)
    .lte('task_date', to)
  if (error) throw error
  return data as unknown as DailyTaskWithBook[]
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
