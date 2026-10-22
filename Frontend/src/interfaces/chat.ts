import type { Subject } from './subject.ts'

export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  subject: Subject | null
  created_at: string
}

// Edge Function `chat` 요청/응답 계약
export interface ChatRequest {
  content: string
}

export interface ChatResponse {
  // 저장된 사용자 메시지 + 코치 답변
  messages: ChatMessage[]
}
