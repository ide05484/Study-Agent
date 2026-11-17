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

// 회독별 목표일만 바꾼다(목표일 지남 모달). 진도 칸은 건드리지 않는다
export async function updateRoundTargets(id: string, roundTargets: (string | null)[]): Promise<void> {
  const { error } = await supabase
    .from('books')
    .update(toBookRow({ round_targets: roundTargets }))
    .eq('id', id)
  if (error) throw error
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

// before 이전 날짜에 아직 안 한(pending) 분량이 하나라도 있는지(앱을 열 때 이월할지 확인)
export async function hasMissedTasks(before: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('daily_tasks')
    .select('id')
    .lt('task_date', before)
    .eq('status', 'pending')
    .limit(1)
  if (error) throw error
  return data.length > 0
}

// 분량 하나를 끝냄(done)/안 끝냄(pending)으로 바꾸고 교재 진도도 함께 맞춘다(DB 함수)
export async function setTaskDone(taskId: string, done: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_task_done', { p_task_id: taskId, p_done: done })
  if (error) throw error
}

// from ~ to (양 끝 포함) 기간의 날짜별 순공시간(분)
export async function fetchStudyTime(from: string, to: string): Promise<{ study_date: string; minutes: number }[]> {
  const { data, error } = await supabase
    .from('study_time')
    .select('study_date, minutes')
    .gte('study_date', from)
    .lte('study_date', to)
  if (error) throw error
  return data
}

// PostgREST가 한 번에 돌려주는 최대 행 수. 이보다 많으면 range로 나눠 다시 요청한다.
// Supabase 프로젝트 API 설정의 max rows(기본 1000)와 같아야 한다. 더 작으면 첫 페이지에서 끝난 것으로 본다
const PAGE_SIZE = 1000

// from ~ to (양 끝 포함) 기간에 학습 기록이 있는 날짜. 하루에 여러 줄이 쌓일 수 있어 1000줄씩 나눠 가져온다
export async function fetchStudyDates(from: string, to: string): Promise<string[]> {
  const dates = new Set<string>()
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('study_logs')
      .select('study_date')
      .gte('study_date', from)
      .lte('study_date', to)
      .order('study_date', { ascending: false })
      .order('id') // 나눠 가져올 때 순서가 흔들리지 않게
      .range(offset, offset + PAGE_SIZE - 1)
    if (error) throw error
    for (const row of data) dates.add(row.study_date)
    if (data.length < PAGE_SIZE) return [...dates]
  }
}
