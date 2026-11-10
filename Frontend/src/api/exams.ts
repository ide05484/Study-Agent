import type { MockExam, NewMockExam } from '../interfaces/mockExam.ts'
import { requireUserId, supabase } from '../libs/supabase.ts'

const EXAM_COLUMNS = 'id, kind, name, taken_on, scores:mock_exam_scores(subject, score)'

// numeric 컬럼은 문자열로 올 수 있어 숫자로 맞춘다
function toMockExam(row: unknown): MockExam {
  const exam = row as MockExam
  return { ...exam, scores: exam.scores.map((s) => ({ subject: s.subject, score: Number(s.score) })) }
}

// 응시일 최신순, 같은 날이면 늦게 등록한 순
export async function fetchMockExams(): Promise<MockExam[]> {
  const { data, error } = await supabase
    .from('mock_exams')
    .select(EXAM_COLUMNS)
    .order('taken_on', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as unknown[]).map(toMockExam)
}

// 시험을 만든 뒤 점수를 넣는다. 점수 insert가 실패하면 만든 시험을 지우고 원래 오류를 던진다
export async function addMockExam(input: NewMockExam): Promise<MockExam> {
  if (input.scores.length === 0) throw new Error('점수를 하나 이상 넣어 주세요.')
  const user_id = await requireUserId()
  const { data: created, error } = await supabase
    .from('mock_exams')
    .insert({ kind: input.kind, name: input.name, taken_on: input.taken_on, user_id })
    .select('id, kind, name, taken_on')
    .single()
  if (error) throw error

  const { error: scoresError } = await supabase
    .from('mock_exam_scores')
    .insert(input.scores.map((s) => ({ mock_exam_id: created.id, user_id, subject: s.subject, score: s.score })))
  if (scoresError) {
    // 보상 삭제가 실패해도 원래 오류를 던진다
    await supabase.from('mock_exams').delete().eq('id', created.id)
    throw scoresError
  }
  return { ...(created as Omit<MockExam, 'scores'>), scores: input.scores }
}

// 점수는 on delete cascade로 같이 지워진다
export async function deleteMockExam(id: string): Promise<void> {
  const { error } = await supabase.from('mock_exams').delete().eq('id', id)
  if (error) throw error
}
