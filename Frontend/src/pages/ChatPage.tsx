import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useChat } from '../hooks/useChat.ts'

// 기본 화면: 매일 알림(오늘의 분량·응원), 학습 기록 보고, 과목별 코치 QnA가 모두 이 채팅에서 이뤄진다
export default function ChatPage() {
  const { messages, sending, error, send } = useChat()
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
        {messages.length === 0 && (
          <p className="chat-empty">오늘 공부한 내용을 알려주거나, 과목별 학습법을 물어보세요.</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`chat-bubble chat-bubble--${m.role}`}>
            {m.content}
          </div>
        ))}
        {error && <p className="chat-error">{error}</p>}
        <div ref={bottomRef} />
      </div>
      <form className="chat-composer" onSubmit={handleSubmit}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="예) 보건행정 30~70p, 기출 20문제 중 5개 틀림"
          aria-label="메시지 입력"
        />
        <button type="submit" disabled={sending || !draft.trim()}>
          보내기
        </button>
      </form>
    </section>
  )
}
