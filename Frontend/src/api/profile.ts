import type { Profile } from '../interfaces/profile.ts'
import { supabase } from '../libs/supabase.ts'

// RLS로 본인 프로필 한 행만 조회된다. 로그인 전이면 null
export async function fetchProfile(): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, exam_date, target_total_score, notify_time, notify_channel, timezone')
    .maybeSingle()
  if (error) throw error
  return data as Profile | null
}

export async function updateExamDate(profileId: string, examDate: string | null): Promise<void> {
  const { error } = await supabase.from('profiles').update({ exam_date: examDate }).eq('id', profileId)
  if (error) throw error
}
