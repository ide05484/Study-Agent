import { useCallback, useEffect, useState } from 'react'
import { fetchChatDates, fetchChatMessages, InvalidContentError, sendChatChoice, sendChatMessage } from '../api/chat.ts'
import { regeneratePlan } from '../api/plan.ts'
import type { ChatMessage, ChatResponse } from '../interfaces/chat.ts'
import { todayKey } from '../libs/date.ts'
import { toErrorMessage } from '../libs/errors.ts'

export const PENDING_REPLY = '답변을 쓰고 있어요…'
const SEND_ERROR = '메시지를 보내지 못했어요. 잠시 후 다시 보내주세요.'
const INVALID_CONTENT_ERROR = '메시지를 보내지 못했어요. 1000자 안으로 적어 다시 보내 주세요.'

export interface ChatState {
  messages: ChatMessage[]
  sending: boolean
  error: string | null
  send: (content: string) => Promise<boolean>
  choose: (messageId: string, answer: 'yes' | 'no') => Promise<boolean>
}

// date 날짜의 채팅방 메시지. 날짜가 바뀌면 호출하는 쪽에서 key로 다시 마운트한다
export function useChat(date: string): ChatState {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    fetchChatMessages(date)
      .then((history) => {
        if (!ignore) setMessages(history)
      })
      .catch((e: unknown) => {
        if (!ignore) setError(toErrorMessage(e))
      })
    return () => {
      ignore = true
    }
  }, [date])

  // 임시 말풍선을 보이고 request를 보낸다. 성공 여부를 돌려준다. 실패하면 임시 말풍선을 지우고 error를 보인다
  const deliver = useCallback(async (content: string, request: () => Promise<ChatResponse>): Promise<boolean> => {
    const now = Date.now()
    const created_at = new Date(now).toISOString()
    const pendingUser: ChatMessage = {
      id: `pending-${now}`,
      role: 'user',
      content,
      subject: null,
      action: null,
      created_at,
    }
    const pendingReply: ChatMessage = {
      id: `pending-${now}-reply`,
      role: 'assistant',
      content: PENDING_REPLY,
      subject: null,
      action: null,
      created_at,
    }
    const isPending = (m: ChatMessage) => m.id === pendingUser.id || m.id === pendingReply.id
    setSending(true)
    setError(null)
    setMessages((prev) => [...prev, pendingUser, pendingReply])
    try {
      const response = await request()
      setMessages((prev) => [...prev.filter((m) => !isPending(m)), ...response.messages])
      if (response.replanFailed) {
        // 교재는 저장됐으니 재분배만 한 번 다시 시도한다. 실패해도 대화는 그대로 둔다
        await regeneratePlan().catch((e: unknown) => console.error('계획 다시 나누기 실패', e))
      }
      return true
    } catch (e) {
      console.error('채팅 전송 실패', e) // 오류 객체만 남기고 메시지 내용은 남기지 않는다
      setMessages((prev) => prev.filter((m) => !isPending(m)))
      setError(e instanceof InvalidContentError ? INVALID_CONTENT_ERROR : SEND_ERROR)
      return false
    } finally {
      setSending(false)
    }
  }, [])

  const send = useCallback((content: string) => deliver(content, () => sendChatMessage(content)), [deliver])

  const choose = useCallback(
    (messageId: string, answer: 'yes' | 'no') =>
      deliver(answer === 'yes' ? '응' : '아니', () => sendChatChoice(messageId, answer)),
    [deliver],
  )

  return { messages, sending, error, send, choose }
}

// 사이드바 채팅방 목록. 열릴 때마다 다시 불러오며, 오늘 채팅방은 항상 맨 위에 둔다
export function useChatDates(open: boolean): { dates: string[]; error: string | null } {
  const [dates, setDates] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let ignore = false
    fetchChatDates()
      .then((result) => {
        if (!ignore) {
          setDates(result)
          setError(null)
        }
      })
      .catch((e: unknown) => {
        if (!ignore) setError(toErrorMessage(e))
      })
    return () => {
      ignore = true
    }
  }, [open])

  const today = todayKey()
  return { dates: dates.includes(today) ? dates : [today, ...dates], error }
}
