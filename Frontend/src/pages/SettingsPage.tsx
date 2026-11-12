import { useEffect, useRef, useState } from 'react'
import BookAddForm from '../components/settings/BookAddForm.tsx'
import BookProgressForm from '../components/settings/BookProgressForm.tsx'
import ExamDateForm from '../components/settings/ExamDateForm.tsx'
import ExamScoreForm from '../components/settings/ExamScoreForm.tsx'
import ExamScoreList from '../components/settings/ExamScoreList.tsx'
import ScoreTabs, { type ScoreView } from '../components/settings/ScoreTabs.tsx'
import ScoreTrendChart from '../components/settings/ScoreTrendChart.tsx'
import Button from '../components/ui/Button.tsx'
import Disclosure from '../components/ui/Disclosure.tsx'
import IconButton from '../components/ui/IconButton.tsx'
import Menu from '../components/ui/Menu.tsx'
import Notice from '../components/ui/Notice.tsx'
import Section from '../components/ui/Section.tsx'
import TextArea from '../components/ui/TextArea.tsx'
import { useBooks } from '../hooks/useBooks.ts'
import { useConfirm } from '../hooks/useDialog.ts'
import { useMockExams } from '../hooks/useMockExams.ts'
import { useProfileContext } from '../hooks/useProfile.ts'
import { isTargetOverdue, progressLabel, targetLabel } from '../libs/books.ts'
import { todayKey } from '../libs/date.ts'
import { SUBJECT_LABELS, SUBJECTS } from '../libs/subjects.ts'

// 공부 설정 변경: 시험일, D-Day까지 남은 공부 분량(추가/수정/삭제), 시험 점수(시험별 블록·과목별 꺾은선 탭), 과목별 공부법 (영역은 괘선으로 구분)
// TODO: 알림 시간·채널 설정 위치 결정
export default function SettingsPage() {
  const { profile, saveExamDate } = useProfileContext()
  const { books, loading, error, notice, add, update, remove } = useBooks()
  const confirm = useConfirm()
  const today = todayKey()
  const { exams, loading: examsLoading, error: examsError, add: addExam } = useMockExams()
  const [adding, setAdding] = useState(false)
  const [addingExam, setAddingExam] = useState(false)
  const [scoreView, setScoreView] = useState<ScoreView>('exams')
  const [editingId, setEditingId] = useState<string | null>(null)
  // 선택 삭제 모드: 제목 줄 ⋮ → 삭제를 누르면 교재 행마다 체크박스가 생긴다
  const [selecting, setSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [removing, setRemoving] = useState(false)
  const cancelSelectRef = useRef<HTMLButtonElement>(null)
  // 목록에서 사라진 교재는 선택에서 빼고 센다
  const selectedBookIds = books.filter((book) => selectedIds.has(book.id)).map((book) => book.id)
  // 선택 삭제 중에는 추가 폼을 열지 않는다
  const bookFormOpen = adding && !selecting

  // 선택 모드로 들어가면 제목 ⋮가 사라지므로 포커스를 취소 버튼으로 옮긴다
  useEffect(() => {
    if (selecting) cancelSelectRef.current?.focus()
  }, [selecting])

  async function removeOne(id: string, title: string) {
    if (removing) return
    const ok = await confirm({
      title: '교재 삭제',
      message: `'${title}'을(를) 삭제할까요?`,
      confirmLabel: '삭제',
      tone: 'danger',
    })
    if (!ok) return
    setRemoving(true)
    const removed = await remove([id])
    setRemoving(false)
    // 삭제한 교재의 수정 폼이 열려 있었다면 닫는다
    if (removed) setEditingId((current) => (current === id ? null : current))
  }

  function startSelecting() {
    setEditingId(null)
    setAdding(false)
    setSelectedIds(new Set())
    setSelecting(true)
  }

  function stopSelecting() {
    setSelecting(false)
    setSelectedIds(new Set())
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function removeSelected() {
    if (selectedBookIds.length === 0 || removing) return
    const confirmed = await confirm({
      title: '교재 삭제',
      message: `교재 ${selectedBookIds.length}권을 삭제할까요?`,
      confirmLabel: '삭제',
      tone: 'danger',
    })
    if (!confirmed) return
    setRemoving(true)
    const removed = await remove(selectedBookIds)
    setRemoving(false)
    if (removed) stopSelecting()
  }

  return (
    <div className="px-4">
      <Section>
        {/* 프로필을 불러온 뒤 저장된 시험일로 폼을 다시 채운다 */}
        <ExamDateForm
          key={profile?.id ?? ''}
          examDate={profile?.exam_date ?? null}
          disabled={!profile}
          onSave={saveExamDate}
        />
      </Section>

      <Section
        title="D-Day까지 남은 공부 분량"
        action={
          // 선택 삭제 중에는 추가 폼과 겹치지 않도록 +와 ⋮를 숨긴다
          !selecting && (
            <div className="flex">
              <IconButton
                icon="plus"
                label="교재 추가"
                aria-expanded={adding}
                aria-controls={adding ? 'book-add-form' : undefined}
                onClick={() => setAdding(!adding)}
              />
              {books.length > 0 && (
                <Menu
                  label="남은 공부 분량 메뉴"
                  items={[{ label: '삭제', tone: 'danger', onSelect: startSelecting }]}
                />
              )}
            </div>
          )
        }
      >
        {bookFormOpen && <BookAddForm id="book-add-form" onAdd={add} onCancel={() => setAdding(false)} />}
        {/* 폼이 열려 있으면 저장 실패를 폼 바로 아래에 보여 준다(목록이 길면 아래 문구가 화면 밖에 있다) */}
        {bookFormOpen && error && (
          <div className="mb-4">
            <Notice tone="error">{error}</Notice>
          </div>
        )}
        {loading && <Notice>불러오는 중…</Notice>}
        {!loading && books.length === 0 && (
          <Notice>등록된 교재가 없어요. 교재를 추가하면 시험일까지 매일 분량을 나눠 드려요.</Notice>
        )}
        <div className="flex flex-col gap-3">
          {SUBJECTS.map((subject) => {
            const own = books.filter((book) => book.subject === subject)
            if (own.length === 0) return null
            return (
              <div key={subject}>
                <h3 className="text-sm font-bold text-muted">{SUBJECT_LABELS[subject]}</h3>
                <ul className="divide-y divide-line">
                  {own.map((book) => (
                    <li key={book.id}>
                      {selecting ? (
                        <label className="flex min-h-11 items-center gap-3">
                          <input
                            type="checkbox"
                            className="size-5 shrink-0 accent-accent"
                            disabled={removing}
                            checked={selectedIds.has(book.id)}
                            onChange={() => toggleSelected(book.id)}
                          />
                          <span className="min-w-0 flex-1 truncate">{book.title}</span>
                          <span className="text-sm text-muted tabular-nums">{progressLabel(book)}</span>
                        </label>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate">{book.title}</span>
                          <span className="text-sm text-muted tabular-nums">{progressLabel(book)}</span>
                          <Menu
                            label={`${book.title} 메뉴`}
                            items={[
                              { label: '수정', onSelect: () => setEditingId(book.id) },
                              { label: '삭제', tone: 'danger', onSelect: () => void removeOne(book.id, book.title) },
                            ]}
                          />
                        </div>
                      )}
                      {targetLabel(book, today) !== null && (
                        <p className={`text-xs ${isTargetOverdue(book, today) ? 'text-danger' : 'text-muted'}`}>
                          {targetLabel(book, today)}
                        </p>
                      )}
                      {!selecting && editingId === book.id && (
                        <BookProgressForm
                          book={book}
                          onSave={(input) => update(book.id, input)}
                          onCancel={() => setEditingId(null)}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
        {notice && (
          <div className="mt-2">
            <Notice>{notice}</Notice>
          </div>
        )}
        {!bookFormOpen && error && (
          <div className="mt-2">
            <Notice tone="error">{error}</Notice>
          </div>
        )}
        {selecting && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button ref={cancelSelectRef} type="button" variant="ghost" disabled={removing} onClick={stopSelecting}>
              취소
            </Button>
            <Button
              type="button"
              disabled={selectedBookIds.length === 0 || removing}
              onClick={() => void removeSelected()}
            >
              {removing ? '삭제하는 중…' : `선택 삭제 (${selectedBookIds.length})`}
            </Button>
          </div>
        )}
      </Section>

      <Section
        title="시험 점수"
        action={
          <IconButton
            icon="plus"
            label="점수 추가"
            aria-expanded={addingExam}
            aria-controls={addingExam ? 'exam-score-form' : undefined}
            onClick={() => setAddingExam(!addingExam)}
          />
        }
      >
        {addingExam && <ExamScoreForm id="exam-score-form" onAdd={addExam} onCancel={() => setAddingExam(false)} />}
        {addingExam && examsError && (
          <div className="mb-4">
            <Notice tone="error">{examsError}</Notice>
          </div>
        )}
        {examsLoading && <Notice>불러오는 중…</Notice>}
        {!examsLoading && exams.length === 0 && (
          <Notice>등록된 점수가 없어요. 모의고사나 시험을 보면 점수를 넣어 주세요.</Notice>
        )}
        {exams.length > 0 && (
          <>
            <ScoreTabs value={scoreView} onChange={setScoreView} idPrefix="score" />
            <div role="tabpanel" id="score-panel" aria-labelledby={`score-tab-${scoreView}`} className="mt-3">
              {scoreView === 'exams' ? (
                <ExamScoreList exams={exams} />
              ) : (
                <ScoreTrendChart exams={exams} subject={scoreView} />
              )}
            </div>
          </>
        )}
        {!addingExam && examsError && (
          <div className="mt-2">
            <Notice tone="error">{examsError}</Notice>
          </div>
        )}
      </Section>

      {/* 과목별 공부법은 준비 중. TODO: 기본 공부법 내용, 메모 저장(테이블 미정) */}
      <Section title="과목별 공부법">
        <div className="divide-y divide-line">
          {SUBJECTS.map((subject) => (
            <Disclosure key={subject} summary={SUBJECT_LABELS[subject]}>
              <div className="grid gap-2 pb-3">
                <Notice>기본 공부법은 준비 중이에요.</Notice>
                <label className="text-sm font-semibold" htmlFor={`memo-${subject}`}>
                  내 메모
                </label>
                <TextArea
                  id={`memo-${subject}`}
                  rows={3}
                  placeholder="더 신경 쓰고 싶은 부분을 적어 두면 코치가 참고해요."
                  disabled
                />
              </div>
            </Disclosure>
          ))}
        </div>
      </Section>
    </div>
  )
}
