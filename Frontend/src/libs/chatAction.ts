import type { ChatMessage } from '../interfaces/chat.ts'

// 응/아니 칩은 오늘 채팅방의 마지막 코치 메시지가 확인 질문일 때만 보인다
export function showsConfirmChips(m: ChatMessage, isLast: boolean, readOnly: boolean): boolean {
  if (readOnly || !isLast || m.role !== 'assistant') return false
  const action = m.action
  if (action === null) return false
  return (action.kind === 'book_add' || action.kind === 'wrap_up') && action.step === 'confirm'
}
