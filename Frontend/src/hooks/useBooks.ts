import { useCallback, useEffect, useState } from 'react'
import { regeneratePlan } from '../api/plan.ts'
import { addBook, deleteBook, fetchBooks } from '../api/study.ts'
import type { Book, NewBook } from '../interfaces/study.ts'
import { toErrorMessage } from '../libs/errors.ts'
import { describePlanResult } from '../libs/plan.ts'

// 공부 설정 화면의 남은 공부 분량(교재) 관리. 추가·삭제할 때마다 계획을 다시 나눈다
export function useBooks() {
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

  // 교재 변경은 이미 저장됐으므로, 재분배 실패는 따로 알린다
  const replan = useCallback(async () => {
    try {
      setNotice(describePlanResult(await regeneratePlan()))
    } catch (e) {
      setError(`교재는 저장했지만 계획을 다시 나누지 못했어요. (${toErrorMessage(e)})`)
    }
  }, [])

  // 성공하면 true. 실패 사유는 error로 노출한다
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
      await replan()
      return true
    },
    [replan],
  )

  const remove = useCallback(
    async (id: string) => {
      setError(null)
      setNotice(null)
      try {
        await deleteBook(id)
        setBooks((prev) => prev.filter((book) => book.id !== id))
      } catch (e) {
        setError(toErrorMessage(e))
        return
      }
      await replan()
    },
    [replan],
  )

  return { books, loading, error, notice, add, remove }
}
