import { useState } from 'react'
import BookAddForm from '../components/settings/BookAddForm.tsx'
import BookProgressForm from '../components/settings/BookProgressForm.tsx'
import ExamDateForm from '../components/settings/ExamDateForm.tsx'
import ExamScoreForm from '../components/settings/ExamScoreForm.tsx'
import ExamScoreList from '../components/settings/ExamScoreList.tsx'
import Button from '../components/ui/Button.tsx'
import Disclosure from '../components/ui/Disclosure.tsx'
import Notice from '../components/ui/Notice.tsx'
import Section from '../components/ui/Section.tsx'
import TextArea from '../components/ui/TextArea.tsx'
import { useBooks } from '../hooks/useBooks.ts'
import { useMockExams } from '../hooks/useMockExams.ts'
import { useProfileContext } from '../hooks/useProfile.ts'
import { progressLabel } from '../libs/books.ts'
import { SUBJECT_LABELS, SUBJECTS } from '../libs/subjects.ts'

// 공부 설정 변경: 시험일, D-Day까지 남은 공부 분량(추가/삭제), 시험 점수, 과목별 공부법 (영역은 괘선으로 구분)
// TODO: 알림 시간·채널 설정 위치 결정
export default function SettingsPage() {
  const { profile, saveExamDate } = useProfileContext()
  const { books, loading, error, notice, add, updateProgress, remove } = useBooks()
  const { exams, loading: examsLoading, error: examsError, add: addExam, remove: removeExam } = useMockExams()
  const [adding, setAdding] = useState(false)
  const [addingExam, setAddingExam] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // 삭제한 교재의 수정 폼이 열려 있었다면 닫는다
  async function handleRemove(id: string) {
    await remove(id)
    setEditingId((current) => (current === id ? null : current))
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

      <Section title="D-Day까지 남은 공부 분량">
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
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate">{book.title}</span>
                        <span className="text-sm text-muted tabular-nums">{progressLabel(book)}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          aria-label={`${book.title} 진도 수정`}
                          onClick={() => setEditingId(editingId === book.id ? null : book.id)}
                        >
                          수정
                        </Button>
                        <button
                          type="button"
                          className="grid size-11 place-items-center rounded-xl text-muted"
                          aria-label={`${book.title} 삭제`}
                          onClick={() => {
                            if (window.confirm(`'${book.title}'을(를) 삭제할까요?`)) void handleRemove(book.id)
                          }}
                        >
                          ✕
                        </button>
                      </div>
                      {editingId === book.id && (
                        <BookProgressForm
                          book={book}
                          onSave={(input) => updateProgress(book.id, input)}
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
        {error && (
          <div className="mt-2">
            <Notice tone="error">{error}</Notice>
          </div>
        )}
        {adding ? (
          <BookAddForm onAdd={add} onCancel={() => setAdding(false)} />
        ) : (
          <div className="mt-3">
            <Button type="button" variant="ghost" block onClick={() => setAdding(true)}>
              교재 추가
            </Button>
          </div>
        )}
      </Section>

      <Section title="시험 점수">
        {examsLoading && <Notice>불러오는 중…</Notice>}
        {!examsLoading && exams.length === 0 && (
          <Notice>등록된 점수가 없어요. 모의고사나 시험을 보면 점수를 넣어 주세요.</Notice>
        )}
        <ExamScoreList exams={exams} onRemove={(id) => void removeExam(id)} />
        {examsError && (
          <div className="mt-2">
            <Notice tone="error">{examsError}</Notice>
          </div>
        )}
        {addingExam ? (
          <ExamScoreForm onAdd={addExam} onCancel={() => setAddingExam(false)} />
        ) : (
          <div className="mt-3">
            <Button type="button" variant="ghost" block onClick={() => setAddingExam(true)}>
              점수 추가
            </Button>
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
