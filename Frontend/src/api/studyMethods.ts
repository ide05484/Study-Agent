import type { Json } from '../interfaces/database.ts'
import type { StudyMethodPair, StudyMethodSection, StudyMethodTopic, StudyTip } from '../interfaces/studyMethod.ts'
import { supabase } from '../libs/supabase.ts'

interface StudyMethodRow {
  topic: string
  position: number
  heading: string
  kind: string
  items: Json
}

function isPair(value: Json): value is { label: string; text: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof value.label === 'string' &&
    typeof value.text === 'string'
  )
}

// 모양이 맞지 않는 줄은 건너뛴다(공부법 한 줄 때문에 탭 전체가 안 보이지 않게)
function toSection(row: StudyMethodRow): StudyMethodSection | null {
  if (!Array.isArray(row.items)) return null
  const base = { topic: row.topic as StudyMethodTopic, position: row.position, heading: row.heading }
  if (row.kind === 'list') {
    return { ...base, kind: 'list', items: row.items.filter((item): item is string => typeof item === 'string') }
  }
  if (row.kind === 'pairs') {
    const items: StudyMethodPair[] = row.items.filter(isPair).map((pair) => ({ label: pair.label, text: pair.text }))
    return { ...base, kind: 'pairs', items }
  }
  return null
}

// 주제(topic), 그 안에서 position 순. time은 코치만 읽는 내용이라 뺀다
export async function fetchStudyMethodSections(): Promise<StudyMethodSection[]> {
  const { data, error } = await supabase
    .from('study_methods')
    .select('topic, position, heading, kind, items')
    .neq('topic', 'time')
    .order('topic')
    .order('position')
  if (error) throw error
  return data.map(toSection).filter((section): section is StudyMethodSection => section !== null)
}

// 본인 팁만 RLS로 읽힌다. 최신순
export async function fetchStudyTips(): Promise<StudyTip[]> {
  const { data, error } = await supabase
    .from('study_tips')
    .select('id, subject, content, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function deleteStudyTip(id: string): Promise<void> {
  const { error } = await supabase.from('study_tips').delete().eq('id', id)
  if (error) throw error
}
