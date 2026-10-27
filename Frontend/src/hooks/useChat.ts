import { useCallback, useEffect, useState } from 'react'
import { fetchChatDates, fetchChatMessages, sendChatMessage } from '../api/chat.ts'
import type { ChatMessage } from '../interfaces/chat.ts'
import { todayKey } from '../libs/date.ts'
import { toErrorMessage } from '../libs/errors.ts'

// date 날짜의 채팅방 메시지. 날짜가 바뀌면 호출하는 쪽에서 key로 다시 마운트한다
export function useChat(date: string) {
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

  const send = useCallback(async (content: string) => {
    setSending(true)
    setError(null)
    try {
      const saved = await sendChatMessage(content)
      setMessages((prev) => [...prev, ...saved])
    } catch (e) {
      setError(toErrorMessage(e))
    } finally {
      setSending(false)
    }
  }, [])

  return { messages, sending, error, send }
}

// 사이드바 채팅방 목록. 열릴 때마다 다시 불러오며, 오늘 채팅방은 항상 맨 위에 둔다
export function useChatDates(open: boolean) {
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
