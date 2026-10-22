import { useCallback, useEffect, useState } from 'react'
import { fetchChatMessages, sendChatMessage } from '../api/chat.ts'
import type { ChatMessage } from '../interfaces/chat.ts'

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    fetchChatMessages()
      .then((history) => {
        if (!ignore) setMessages(history)
      })
      .catch((e: unknown) => {
        if (!ignore) setError(toMessage(e))
      })
    return () => {
      ignore = true
    }
  }, [])

  const send = useCallback(async (content: string) => {
    setSending(true)
    setError(null)
    try {
      const saved = await sendChatMessage(content)
      setMessages((prev) => [...prev, ...saved])
    } catch (e) {
      setError(toMessage(e))
    } finally {
      setSending(false)
    }
  }, [])

  return { messages, sending, error, send }
}

function toMessage(e: unknown): string {
  return e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.'
}
