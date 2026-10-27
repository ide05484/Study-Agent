import { useState } from 'react'
import BookAddForm from '../components/settings/BookAddForm.tsx'
import ExamDateForm from '../components/settings/ExamDateForm.tsx'
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
    <div className="page">
      <section className="card">
        {/* 프로필을 불러온 뒤 저장된 시험일로 폼을 다시 채운다 */}
        <ExamDateForm
          key={profile?.id ?? ''}
          examDate={profile?.exam_date ?? null}
          disabled={!profile}
          onSave={saveExamDate}
        />
      </section>

      <section className="card">
        <h2 className="section-title">D-Day까지 남은 공부 분량</h2>
        {loading && <p className="muted">불러오는 중…</p>}
        {!loading && books.length === 0 && <p className="muted">등록된 교재가 없어요.</p>}
        {SUBJECTS.map((subject) => {
          const own = books.filter((book) => book.subject === subject)
          if (own.length === 0) return null
          return (
            <div key={subject} className="book-group">
              <h3 className="book-group-title">{SUBJECT_LABELS[subject]}</h3>
              <ul className="book-list">
                {own.map((book) => (
                  <li key={book.id} className="book-row">
                    <span className="book-title">{book.title}</span>
                    <span className="muted">
                      {book.current_page}/{book.total_pages}p
                    </span>
                    <button
                      type="button"
                      className="icon-button icon-button--small"
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
        {notice && <p className="muted">{notice}</p>}
        {error && <p className="error-text">{error}</p>}
        {adding ? (
          <BookAddForm onAdd={add} onCancel={() => setAdding(false)} />
        ) : (
          <button type="button" className="button button--ghost button--block" onClick={() => setAdding(true)}>
            + 교재 추가
          </button>
        )}
      </section>

      {/* 과목별 공부법은 준비 중. TODO: 기본 공부법 내용, 메모 저장(테이블 미정) */}
      <section className="card">
        <h2 className="section-title">과목별 공부법</h2>
        {SUBJECTS.map((subject) => (
          <details key={subject} className="method">
            <summary className="method-summary">
              {SUBJECT_LABELS[subject]}
              <span className="chevron" aria-hidden="true" />
            </summary>
            <div className="method-body">
              <p className="muted">기본 공부법은 준비 중이에요.</p>
              <label className="field-label" htmlFor={`memo-${subject}`}>
                내 메모
              </label>
              <textarea
                id={`memo-${subject}`}
                className="field"
                rows={3}
                placeholder="더 신경 쓰고 싶은 부분을 적어 두면 코치가 참고해요."
                disabled
              />
            </div>
          </details>
        ))}
      </section>
    </div>
  )
}
