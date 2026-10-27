import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useParams } from 'react-router'
import TodayPlan from '../components/chat/TodayPlan.tsx'
import { useChat } from '../hooks/useChat.ts'
import type { ChatRole } from '../interfaces/chat.ts'
import { isDateKey, todayKey } from '../libs/date.ts'
import { WELCOME_MESSAGE } from '../libs/menu.ts'

// 말풍선: 코치는 왼쪽·surface, 사용자는 오른쪽·accent-soft. 꼬리 쪽 모서리만 4px
const BUBBLE_CLASS: Record<ChatRole, string> = {
  assistant: 'self-start rounded-bl-sm bg-surface',
  user: 'self-end rounded-br-sm bg-accent-soft',
}

// 채팅방은 하루에 하나. `/`는 오늘 채팅방, `/chat/:date`는 지난 채팅방(읽기 전용)
// 오늘의 분량 안내, 학습 기록 보고, 과목별 코치 QnA가 모두 이 채팅에서 이뤄진다
export default function ChatPage() {
  const params = useParams()
  const today = todayKey()
  const date = params.date ?? today

  if (!isDateKey(date)) return <Navigate to="/" replace />
  return <ChatRoom key={date} date={date} readOnly={date !== today} />
}

function ChatRoom({ date, readOnly }: { date: string; readOnly: boolean }) {
  const { messages, sending, error, send } = useChat(date)
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const content = draft.trim()
    if (!content || sending) return
    setDraft('')
    void send(content)
  }

  return (
    <section className="flex h-full flex-col">
      {!readOnly && <TodayPlan date={date} />}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
        <Bubble role="assistant">{WELCOME_MESSAGE}</Bubble>
        {messages.map((m) => (
          <Bubble key={m.id} role={m.role}>
            {m.content}
          </Bubble>
        ))}
        {error && <p className="text-sm text-danger">{error}</p>}
        <div ref={bottomRef} />
      </div>
      {readOnly ? (
        <p className="border-t border-line px-4 py-3.5 text-center text-sm text-muted">지난 대화는 볼 수만 있어요.</p>
      ) : (
        <form className="flex gap-2 border-t border-line px-3 py-2" onSubmit={handleSubmit}>
          <input
            className="min-w-0 flex-1 rounded-full border border-line bg-bg px-4 py-2.5"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="예) 보건행정 30~70p, 기출 20문제 중 5개 틀림"
            aria-label="메시지 입력"
          />
          <button
            type="submit"
            className="grid size-11 flex-none place-items-center rounded-full bg-accent text-on-accent disabled:opacity-40"
            aria-label="보내기"
            disabled={sending || !draft.trim()}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 12h14M12 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </form>
      )}
    </section>
  )
}

function Bubble({ role, children }: { role: ChatRole; children: string }) {
  return (
    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 break-words whitespace-pre-wrap ${BUBBLE_CLASS[role]}`}>
      {children}
    </div>
  )
}
