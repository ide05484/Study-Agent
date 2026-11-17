import { useCallback, useEffect, useState } from 'react'
import { fetchChatDates, fetchChatMessages, sendChatMessage } from '../api/chat.ts'
import type { ChatMessage } from '../interfaces/chat.ts'
import { todayKey } from '../libs/date.ts'
import { toErrorMessage } from '../libs/errors.ts'

export const PENDING_REPLY = '답변을 쓰고 있어요…'
const SEND_ERROR = '메시지를 보내지 못했어요. 잠시 후 다시 보내주세요.'

export interface ChatState {
  messages: ChatMessage[]
  sending: boolean
  error: string | null
  send: (content: string) => Promise<boolean>
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

  // 성공 여부를 돌려준다. 실패하면 임시 말풍선을 지우고 error를 보인다
  const send = useCallback(async (content: string): Promise<boolean> => {
    const now = Date.now()
    const created_at = new Date(now).toISOString()
    const pendingUser: ChatMessage = { id: `pending-${now}`, role: 'user', content, subject: null, created_at }
    const pendingReply: ChatMessage = {
      id: `pending-${now}-reply`,
      role: 'assistant',
      content: PENDING_REPLY,
      subject: null,
      created_at,
    }
    const isPending = (m: ChatMessage) => m.id === pendingUser.id || m.id === pendingReply.id
    setSending(true)
    setError(null)
    setMessages((prev) => [...prev, pendingUser, pendingReply])
    try {
      const response = await sendChatMessage(content)
      setMessages((prev) => [...prev.filter((m) => !isPending(m)), ...response.messages])
      return true
    } catch {
      setMessages((prev) => prev.filter((m) => !isPending(m)))
      setError(SEND_ERROR)
      return false
    } finally {
      setSending(false)
    }
  }, [])

  return { messages, sending, error, send }
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
