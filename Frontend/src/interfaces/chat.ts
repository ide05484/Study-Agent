import type { BookUnit } from './study.ts'
import type { Subject } from './subject.ts'

export type ChatRole = 'user' | 'assistant'

// 채팅으로 교재를 추가하는 중의 초안. 아직 못 정한 항목은 null (백엔드 chat/bookDraft.ts와 같은 모양)
export interface BookDraft {
  subject: Subject | null
  title: string | null
  unit: BookUnit | null
  total_units: number | null
  target_rounds: number
}

// 코치 메시지에 붙는 다음 동작. confirm이면 응/아니 칩을 보인다
export interface BookAddAction {
  kind: 'book_add'
  step: 'ask' | 'confirm' | 'edit'
  draft: BookDraft
}

export type ChatAction = BookAddAction

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  subject: Subject | null
  action: ChatAction | null
  created_at: string
}

// Edge Function `chat` 요청/응답 계약
export type ChatRequest = { content: string } | { choice: { message_id: string; answer: 'yes' | 'no' } }

export interface ChatResponse {
  // 저장된 사용자 메시지 + 코치 답변
  messages: ChatMessage[]
  // 진도·학습 기록을 저장했으면 true (오늘의 분량을 다시 불러온다)
  logged: boolean
  // 교재 추가로 계획이 다시 나뉘었으면 true (오늘의 분량을 다시 불러온다)
  planChanged: boolean
  // 교재는 저장했지만 계획을 다시 나누지 못했으면 true (프런트가 재분배를 한 번 부른다)
  replanFailed: boolean
}
