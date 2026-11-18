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
  // 진도·학습 기록을 저장했으면 true (오늘의 분량을 다시 불러온다)
  logged: boolean
}
