import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useParams } from 'react-router'
import { useChat } from '../hooks/useChat.ts'
import { isDateKey, todayKey } from '../libs/date.ts'
import { WELCOME_MESSAGE } from '../libs/menu.ts'

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
    <section className="chat">
      <div className="chat-messages">
        <div className="chat-bubble chat-bubble--assistant">{WELCOME_MESSAGE}</div>
        {messages.map((m) => (
          <div key={m.id} className={`chat-bubble chat-bubble--${m.role}`}>
            {m.content}
          </div>
        ))}
        {error && <p className="error-text">{error}</p>}
        <div ref={bottomRef} />
      </div>
      {readOnly ? (
        <p className="chat-readonly">지난 대화는 볼 수만 있어요.</p>
      ) : (
        <form className="chat-composer" onSubmit={handleSubmit}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="예) 보건행정 30~70p, 기출 20문제 중 5개 틀림"
            aria-label="메시지 입력"
          />
          <button type="submit" aria-label="보내기" disabled={sending || !draft.trim()}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 12h14M12 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </form>
      )}
    </section>
  )
}
