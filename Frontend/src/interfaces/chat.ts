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

// 공부 마무리 확인(응/아니 칩)
export interface WrapUpAction {
  kind: 'wrap_up'
  step: 'confirm'
}

// 순공시간을 되묻는 메시지
export interface StudyTimeAskAction {
  kind: 'study_time_ask'
}

// 오늘 쓸 수 있는 시간을 되묻는 메시지
export interface TimeAvailableAskAction {
  kind: 'time_available_ask'
}

// 백엔드 chat/actions.ts의 ChatAction과 같은 모양
export type ChatAction = BookAddAction | WrapUpAction | StudyTimeAskAction | TimeAvailableAskAction

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  subject: Subject | null
  action: ChatAction | null
  created_at: string
}

// Edge Function `chat` 요청/응답 계약 (하루 첫 메시지는 함수를 거치지 않고 화면이 DB 함수로 저장한다)
export type ChatRequest = { content: string } | { choice: { message_id: string; answer: 'yes' | 'no' } }

export interface ChatResponse {
  // 저장된 사용자 메시지 + 코치 답변. 밀림(superseded)이면 사용자 메시지만
  messages: ChatMessage[]
  // 진도·학습 기록을 저장했으면 true (오늘의 분량을 다시 불러온다)
  logged: boolean
  // 교재 추가로 계획이 다시 나뉘었으면 true (오늘의 분량을 다시 불러온다)
  planChanged: boolean
  // 교재 추가 뒤 계획을 다시 나누지 못했으면 true (프런트가 재분배를 한 번 부른다)
  replanFailed: boolean
  // 더 새 글이 있어 이 요청의 답변을 건너뛰었으면 true
  superseded: boolean
}
