import type { ChatMessage, ChatRequest, ChatResponse } from '../interfaces/chat.ts'
import { dayRange, toDateKey } from '../libs/date.ts'
import { supabase } from '../libs/supabase.ts'

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

export async function sendChatMessage(content: string): Promise<ChatMessage[]> {
  const body: ChatRequest = { content }
  const { data, error } = await supabase.functions.invoke<ChatResponse>('chat', { body })
  if (error) throw error
  return data?.messages ?? []
}
