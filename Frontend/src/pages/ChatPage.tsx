import { Fragment, useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useParams } from 'react-router'
import ConfirmChips from '../components/chat/ConfirmChips.tsx'
import TodayPlanButton from '../components/chat/TodayPlanButton.tsx'
import TodayPlanSheet from '../components/chat/TodayPlanSheet.tsx'
import { PENDING_REPLY_ID, useChat } from '../hooks/useChat.ts'
import { useTodayTasks } from '../hooks/useTodayTasks.ts'
import type { ChatRole } from '../interfaces/chat.ts'
import { showsConfirmChips } from '../libs/chatAction.ts'
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

interface ChatRoomProps {
  date: string
  readOnly: boolean
}

function ChatRoom({ date, readOnly }: ChatRoomProps) {
  const { messages, loaded, opening, sending, error, send, choose } = useChat(date, readOnly)
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  // 서버가 만든 첫 메시지(코치)가 없을 때만 고정 문구를 맨 위에 그린다. 열기 응답을 기다리는 동안은 그리지 않는다
  const showsWelcome = loaded && !opening && messages[0]?.role !== 'assistant'
  // 불러오거나 첫 메시지를 받는 동안은 보내지 않는다(조회 결과가 임시 말풍선을 덮어쓰지 않게)
  const blocked = !loaded || opening

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  // 답을 기다리는 동안에도 보낼 수 있다
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const content = draft.trim()
    if (!content || blocked) return
    setDraft('')
    void send(content).then((ok) => {
      if (ok) return
      // 연달아 보낸 글이 함께 실패해도 모두 되돌리고, 그 사이 새로 친 글도 남긴다
      // 한 줄 입력창은 줄바꿈을 지우므로 공백으로 잇는다
      setDraft((current) => (current ? `${current} ${content}` : content))
    })
  }

  return (
    <section className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
        {showsWelcome && <Bubble role="assistant">{WELCOME_MESSAGE}</Bubble>}
        {messages.map((m, i) => (
          <Fragment key={m.id}>
            <Bubble role={m.role} muted={m.id === PENDING_REPLY_ID}>
              {m.content}
            </Bubble>
            {/* 확인 칩은 오늘 채팅방의 마지막 코치 메시지에만 붙는다. 지난 확인은 다음 말풍선이 고른 답이다 */}
            {showsConfirmChips(m, i === messages.length - 1, readOnly) && (
              <ConfirmChips disabled={sending} onChoose={(answer) => void choose(m.id, answer)} />
            )}
          </Fragment>
        ))}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div ref={bottomRef} />
      </div>
      {readOnly ? (
        <p className="border-t border-line px-4 py-3.5 text-center text-sm text-muted">지난 대화는 볼 수만 있어요.</p>
      ) : (
        <div>
          <TodayPlanDock date={date} />
          <form className="flex gap-2 border-t border-line px-3 py-2" onSubmit={handleSubmit}>
            <input
              className="min-w-0 flex-1 rounded-full border border-line bg-bg px-4 py-2.5"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={1000}
              placeholder="예) 보건행정 기본서 15~17강, 기출 20문제 중 5개 틀림"
              aria-label="메시지 입력"
            />
            <button
              type="submit"
              className="grid size-11 flex-none place-items-center rounded-full bg-accent text-on-accent disabled:opacity-40"
              aria-label="보내기"
              disabled={blocked || !draft.trim()}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M4 12h14M12 5l7 7-7 7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </form>
        </div>
      )}
    </section>
  )
}

// 오늘 채팅방에서만 그린다(지난 날짜로 조회하지 않도록 조회·시트 상태를 여기서 갖는다)
interface TodayPlanDockProps {
  date: string
}

function TodayPlanDock({ date }: TodayPlanDockProps) {
  const { tasks, error, reload, toggle, savingIds, toggleError, clearToggleError } = useTodayTasks(date)
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="flex min-h-[3.25rem] justify-end px-3 pb-2">
        <TodayPlanButton
          tasks={tasks}
          error={error}
          onOpen={() => {
            clearToggleError() // 지난 저장 실패 문구는 시트를 열 때 비운다
            setOpen(true)
          }}
          onRetry={reload}
        />
      </div>
      <TodayPlanSheet
        open={open}
        onClose={() => setOpen(false)}
        tasks={tasks ?? []}
        savingIds={savingIds}
        toggleError={toggleError}
        onToggle={(taskId, done) => void toggle(taskId, done)}
      />
    </>
  )
}

interface BubbleProps {
  role: ChatRole
  children: string
  muted?: boolean
}

function Bubble({ role, children, muted = false }: BubbleProps) {
  return (
    <div
      className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 break-words whitespace-pre-wrap ${BUBBLE_CLASS[role]} ${muted ? 'text-muted' : ''}`}
    >
      {children}
    </div>
  )
}
