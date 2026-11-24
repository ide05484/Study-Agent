import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchChatDates,
  fetchChatMessages,
  InvalidContentError,
  openChatRoom,
  sendChatChoice,
  sendChatMessage,
} from '../api/chat.ts'
import { regeneratePlan } from '../api/plan.ts'
import type { ChatMessage, ChatResponse } from '../interfaces/chat.ts'
import { todayKey } from '../libs/date.ts'
import { toErrorMessage } from '../libs/errors.ts'

// 답변 대기 말풍선. 진행 중인 요청이 몇 개든 목록 맨 끝에 하나만 둔다
export const PENDING_REPLY_ID = 'pending-reply'
const PENDING_REPLY = '답변을 쓰고 있어요…'
const SEND_ERROR = '메시지를 보내지 못했어요. 잠시 후 다시 보내주세요.'
const INVALID_CONTENT_ERROR = '메시지를 보내지 못했어요. 1000자 안으로 적어 다시 보내 주세요.'

export interface ChatState {
  messages: ChatMessage[]
  // 처음 메시지 조회가 끝남(실패 포함)
  loaded: boolean
  // 오늘 채팅방 열기 요청(하루 첫 메시지)이 진행 중
  opening: boolean
  // 답을 기다리는 요청이 하나라도 있음
  sending: boolean
  error: string | null
  send: (content: string) => Promise<boolean>
  choose: (messageId: string, answer: 'yes' | 'no') => Promise<boolean>
}

// date 날짜의 채팅방 메시지. 날짜가 바뀌면 호출하는 쪽에서 key로 다시 마운트한다
// 오늘 채팅방(readOnly가 아님)이 비어 있으면 서버에 열기 요청을 보내 하루 첫 메시지를 받는다
export function useChat(date: string, readOnly: boolean): ChatState {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loaded, setLoaded] = useState(false)
  const [opening, setOpening] = useState(false)
  const [inFlight, setInFlight] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const seqRef = useRef(0)
  // 답을 기다리는 요청의 순번. 늦게 온 응답이 최신 진행 상태를 읽도록 ref에 둔다(상태는 화면용 개수)
  const inFlightRef = useRef(new Set<number>())

  useEffect(() => {
    let ignore = false
    fetchChatMessages(date)
      .then((history) => {
        if (ignore) return
        setMessages(history)
        setLoaded(true)
        // 메시지가 이미 있는 날에는 열기 요청을 보내지 않는다
        if (readOnly || history.length > 0) return
        setOpening(true)
        openChatRoom()
          .then(async (response) => {
            if (response.replanFailed) {
              // 첫 메시지는 저장됐으니 재분배만 한 번 다시 시도한다. 실패해도 대화는 그대로 둔다
              regeneratePlan().catch((e: unknown) => console.error('계획 다시 나누기 실패', e))
            }
            // 오류 없이 비었으면 다른 탭이 먼저 첫 메시지를 넣은 것이라 한 번 다시 불러온다. 그래도 비면 고정 문구다
            const opened = response.messages.length > 0 ? response.messages : await fetchChatMessages(date)
            if (!ignore) setMessages((prev) => [...opened, ...prev])
          })
          // 실패하면 오류 문구 없이 고정 문구를 보여 준다
          .catch((e: unknown) => console.error('채팅방 열기 실패', e))
          .finally(() => {
            if (!ignore) setOpening(false)
          })
      })
      .catch((e: unknown) => {
        if (ignore) return
        setError(toErrorMessage(e))
        setLoaded(true)
      })
    return () => {
      ignore = true
    }
  }, [date, readOnly])

  // 임시 말풍선을 보이고 request를 보낸다. 성공 여부를 돌려준다. 답을 기다리는 동안에도 또 보낼 수 있다
  // 응답이 오면 임시 말풍선을 저장된 메시지로 제자리에서 바꾸고, 실패하면 그 말풍선만 지우고 error를 보인다
  const deliver = useCallback(async (content: string, request: () => Promise<ChatResponse>): Promise<boolean> => {
    seqRef.current += 1
    const seq = seqRef.current
    const pendingId = `pending-${seq}`
    const created_at = new Date().toISOString()
    const pendingUser: ChatMessage = { id: pendingId, role: 'user', content, subject: null, action: null, created_at }
    const pendingReply: ChatMessage = {
      id: PENDING_REPLY_ID,
      role: 'assistant',
      content: PENDING_REPLY,
      subject: null,
      action: null,
      created_at,
    }
    const inFlightSeqs = inFlightRef.current
    inFlightSeqs.add(seq)
    setInFlight(inFlightSeqs.size)
    setError(null)
    setMessages((prev) => [...prev.filter((m) => m.id !== PENDING_REPLY_ID), pendingUser, pendingReply])

    // 이 요청을 끝냈다고 센다. 남은 요청이 없거나, 코치 답이 왔고 이보다 새 요청이 진행 중이 아니면 대기 말풍선을 지운다
    // (서버는 가장 새 요청에만 답한다). 뒤늦게 온 밀린 응답은 사용자 말풍선만 확정하고 대기 말풍선을 다시 만들지 않는다
    function settle(replacement: ChatMessage[]) {
      inFlightSeqs.delete(seq)
      setInFlight(inFlightSeqs.size)
      const answered = replacement.some((m) => m.role === 'assistant')
      const done = inFlightSeqs.size === 0 || (answered && ![...inFlightSeqs].some((s) => s > seq))
      setMessages((prev) => {
        const next = prev.flatMap((m) => (m.id === pendingId ? replacement : [m]))
        return done ? next.filter((m) => m.id !== PENDING_REPLY_ID) : next
      })
    }

    try {
      const response = await request()
      // 사용자 메시지를 제자리에 두고 코치 답은 바로 뒤에 둔다. 밀려난 응답(superseded)은 사용자 메시지뿐이다
      settle([
        ...response.messages.filter((m) => m.role === 'user'),
        ...response.messages.filter((m) => m.role === 'assistant'),
      ])
      if (response.replanFailed) {
        // 교재는 저장됐으니 재분배만 한 번 다시 시도한다. 실패해도 대화는 그대로 둔다
        await regeneratePlan().catch((e: unknown) => console.error('계획 다시 나누기 실패', e))
      }
      return true
    } catch (e) {
      console.error('채팅 전송 실패', e) // 오류 객체만 남기고 메시지 내용은 남기지 않는다
      settle([])
      setError(e instanceof InvalidContentError ? INVALID_CONTENT_ERROR : SEND_ERROR)
      return false
    }
  }, [])

  const send = useCallback((content: string) => deliver(content, () => sendChatMessage(content)), [deliver])

  const choose = useCallback(
    (messageId: string, answer: 'yes' | 'no') =>
      deliver(answer === 'yes' ? '응' : '아니', () => sendChatChoice(messageId, answer)),
    [deliver],
  )

  return { messages, loaded, opening, sending: inFlight > 0, error, send, choose }
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
