import type { ChatMessage, ChatRequest, ChatResponse } from '../interfaces/chat.ts'
import { supabase } from '../libs/supabase.ts'

export async function fetchChatMessages(): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, role, content, subject, created_at')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as ChatMessage[]
}

export async function sendChatMessage(content: string): Promise<ChatMessage[]> {
  const body: ChatRequest = { content }
  const { data, error } = await supabase.functions.invoke<ChatResponse>('chat', { body })
  if (error) throw error
  return data?.messages ?? []
}
