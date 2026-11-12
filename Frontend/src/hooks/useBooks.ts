import { useCallback, useEffect, useRef, useState } from 'react'
import { regeneratePlan } from '../api/plan.ts'
import { addBook, deleteBooks, fetchBooks, updateBookProgress } from '../api/study.ts'
import type { Book, BookProgress, NewBook } from '../interfaces/study.ts'
import { toErrorMessage } from '../libs/errors.ts'
import { describePlanResult } from '../libs/plan.ts'

export interface BooksState {
  books: Book[]
  loading: boolean
  error: string | null
  notice: string | null
  // 아래 셋은 저장되면 바로 true를 돌려주고 계획은 뒤에서 다시 나눈다(진행·결과는 notice, 실패는 error)
  add: (input: NewBook) => Promise<boolean>
  updateProgress: (id: string, input: BookProgress) => Promise<boolean>
  // 한 권 또는 선택한 여러 권을 지우고 계획은 한 번만 다시 나눈다
  remove: (ids: string[]) => Promise<boolean>
}

// 공부 설정 화면의 남은 공부 분량(교재) 관리. 추가·진도 수정·삭제할 때마다 계획을 뒤에서 다시 나눈다
export function useBooks(): BooksState {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    fetchBooks()
      .then((result) => {
        if (!ignore) setBooks(result)
      })
      .catch((e: unknown) => {
        if (!ignore) setError(toErrorMessage(e))
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [])

  // 재분배가 도는 중인지, 도는 중에 또 요청됐는지
  const replanningRef = useRef(false)
  const replanAgainRef = useRef(false)

  // 교재 변경은 이미 저장됐으므로 재분배는 기다리지 않고 뒤에서 돌린다. 실패는 따로 알린다.
  // 도는 중에 또 요청되면 끝난 뒤 한 번만 더 돌리고(마지막 저장 상태로 나누기 위해), 앞 결과는 띄우지 않는다
  const replan = useCallback(() => {
    setNotice('계획을 다시 나누는 중이에요…')
    if (replanningRef.current) {
      replanAgainRef.current = true
      return
    }
    replanningRef.current = true
    void (async () => {
      try {
        do {
          replanAgainRef.current = false
          try {
            const result = await regeneratePlan()
            if (!replanAgainRef.current) setNotice(describePlanResult(result))
          } catch (e) {
            if (!replanAgainRef.current) {
              setNotice(null)
              setError(`교재는 저장했지만 계획을 다시 나누지 못했어요. (${toErrorMessage(e)})`)
            }
          }
        } while (replanAgainRef.current)
      } finally {
        replanningRef.current = false
      }
    })()
  }, [])

  // 저장되면 바로 true(재분배는 뒤에서). 실패 사유는 error로 노출한다
  const add = useCallback(
    async (input: NewBook) => {
      setError(null)
      setNotice(null)
      try {
        const created = await addBook(input)
        setBooks((prev) => [...prev, created])
      } catch (e) {
        setError(toErrorMessage(e))
        return false
      }
      replan()
      return true
    },
    [replan],
  )

  const updateProgress = useCallback(
    async (id: string, input: BookProgress) => {
      setError(null)
      setNotice(null)
      try {
        const updated = await updateBookProgress(id, input)
        setBooks((prev) => prev.map((book) => (book.id === id ? updated : book)))
      } catch (e) {
        setError(toErrorMessage(e))
        return false
      }
      replan()
      return true
    },
    [replan],
  )

  const remove = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return true
      setError(null)
      setNotice(null)
      try {
        await deleteBooks(ids)
        const removed = new Set(ids)
        setBooks((prev) => prev.filter((book) => !removed.has(book.id)))
      } catch (e) {
        setError(toErrorMessage(e))
        return false
      }
      replan()
      return true
    },
    [replan],
  )

  return { books, loading, error, notice, add, updateProgress, remove }
}
