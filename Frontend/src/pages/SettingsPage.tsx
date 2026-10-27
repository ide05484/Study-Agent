import { useState } from 'react'
import BookAddForm from '../components/settings/BookAddForm.tsx'
import ExamDateForm from '../components/settings/ExamDateForm.tsx'
import { cardClass, chevronClass, fieldClass, ghostButtonClass, sectionTitleClass } from '../components/ui/classes.ts'
import { useBooks } from '../hooks/useBooks.ts'
import { useProfileContext } from '../hooks/useProfile.ts'
import { SUBJECT_LABELS, SUBJECTS } from '../libs/subjects.ts'

// 공부 설정 변경: 시험일, D-Day까지 남은 공부 분량(추가/삭제), 과목별 공부법
// TODO: 알림 시간·채널 설정 위치 결정
export default function SettingsPage() {
  const { profile, saveExamDate } = useProfileContext()
  const { books, loading, error, notice, add, remove } = useBooks()
  const [adding, setAdding] = useState(false)

  return (
    <div className="flex flex-col gap-4 p-4">
      <section className={cardClass}>
        {/* 프로필을 불러온 뒤 저장된 시험일로 폼을 다시 채운다 */}
        <ExamDateForm
          key={profile?.id ?? ''}
          examDate={profile?.exam_date ?? null}
          disabled={!profile}
          onSave={saveExamDate}
        />
      </section>

      <section className={cardClass}>
        <h2 className={sectionTitleClass}>D-Day까지 남은 공부 분량</h2>
        {loading && <p className="text-sm text-muted">불러오는 중…</p>}
        {!loading && books.length === 0 && <p className="text-sm text-muted">등록된 교재가 없어요.</p>}
        <div className="flex flex-col gap-3">
          {SUBJECTS.map((subject) => {
            const own = books.filter((book) => book.subject === subject)
            if (own.length === 0) return null
            return (
              <div key={subject}>
                <h3 className="mb-1 text-sm font-bold text-muted">{SUBJECT_LABELS[subject]}</h3>
                <ul>
                  {own.map((book) => (
                    <li key={book.id} className="flex items-center gap-2">
                      <span className="min-w-0 flex-1">{book.title}</span>
                      <span className="text-sm text-muted">
                        {book.current_page}/{book.total_pages}p
                      </span>
                      <button
                        type="button"
                        className="grid size-11 place-items-center rounded-xl text-muted"
                        aria-label={`${book.title} 삭제`}
                        onClick={() => {
                          if (window.confirm(`'${book.title}'을(를) 삭제할까요?`)) void remove(book.id)
                        }}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
        {notice && <p className="mt-2 text-sm text-muted">{notice}</p>}
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        {adding ? (
          <BookAddForm onAdd={add} onCancel={() => setAdding(false)} />
        ) : (
          <button type="button" className={`${ghostButtonClass} mt-3 w-full`} onClick={() => setAdding(true)}>
            + 교재 추가
          </button>
        )}
      </section>

      {/* 과목별 공부법은 준비 중. TODO: 기본 공부법 내용, 메모 저장(테이블 미정) */}
      <section className={cardClass}>
        <h2 className={sectionTitleClass}>과목별 공부법</h2>
        <div className="divide-y divide-line">
          {SUBJECTS.map((subject) => (
            <details key={subject} className="group">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between font-semibold [&::-webkit-details-marker]:hidden">
                {SUBJECT_LABELS[subject]}
                <span className={`${chevronClass} group-open:-rotate-135`} aria-hidden="true" />
              </summary>
              <div className="grid gap-2 pb-3">
                <p className="text-sm text-muted">기본 공부법은 준비 중이에요.</p>
                <label className="text-sm font-semibold" htmlFor={`memo-${subject}`}>
                  내 메모
                </label>
                <textarea
                  id={`memo-${subject}`}
                  className={fieldClass}
                  rows={3}
                  placeholder="더 신경 쓰고 싶은 부분을 적어 두면 코치가 참고해요."
                  disabled
                />
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}
