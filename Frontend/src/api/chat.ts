import { FunctionsHttpError } from '@supabase/supabase-js'
import type { ChatMessage, ChatRequest, ChatResponse } from '../interfaces/chat.ts'
import { dayRange, toDateKey } from '../libs/date.ts'
import { emitPlanChanged } from '../libs/planEvents.ts'
import { supabase } from '../libs/supabase.ts'
import { signOut } from './auth.ts'

// 채팅방은 하루 단위: 해당 날짜에 생성된 메시지만 가져온다
export async function fetchChatMessages(date: string): Promise<ChatMessage[]> {
  const [from, to] = dayRange(date)
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, role, content, subject, created_at')
    .gte('created_at', from)
    .lt('created_at', to)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as ChatMessage[]
}

// 메시지가 있는 날짜 목록 (최신순)
// TODO: 메시지가 많아지면 날짜별 집계 뷰로 옮긴다
export async function fetchChatDates(): Promise<string[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return [...new Set((data as { created_at: string }[]).map((row) => toDateKey(row.created_at)))]
}

// chat 함수가 400 invalid_content(빈 내용·1000자 초과)로 거절했을 때
export class InvalidContentError extends Error {
  constructor() {
    super('invalid_content')
    this.name = 'InvalidContentError'
  }
}

// 진도·학습 기록이 저장됐으면(logged) 오늘의 분량을 다시 불러오게 알린다
// 401(로그인 만료)이면 로그아웃해서 세션 가드가 /login으로 보내게 한다
export async function sendChatMessage(content: string): Promise<ChatResponse> {
  const body: ChatRequest = { content }
  const { data, error } = await supabase.functions.invoke<ChatResponse>('chat', { body })
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const status = (error.context as Response).status
      if (status === 401) await signOut()
      if (status === 400) throw new InvalidContentError()
    }
    throw error
  }
  if (!data) throw new Error('답변을 받지 못했어요.')
  if (data.logged) emitPlanChanged()
  return data
}
