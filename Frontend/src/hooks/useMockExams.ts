import { useCallback, useEffect, useState } from 'react'
import { addMockExam, deleteMockExam, fetchMockExams } from '../api/exams.ts'
import type { MockExam, NewMockExam } from '../interfaces/mockExam.ts'
import { toErrorMessage } from '../libs/errors.ts'

export interface MockExamsState {
  exams: MockExam[]
  loading: boolean
  error: string | null
  // 성공하면 true. 실패 사유는 error로 노출한다
  add: (input: NewMockExam) => Promise<boolean>
  remove: (id: string) => Promise<void>
}

// 공부 설정 화면의 시험 점수 관리. 점수를 바꿔도 계획은 다시 나누지 않는다
export function useMockExams(): MockExamsState {
  const [exams, setExams] = useState<MockExam[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    fetchMockExams()
      .then((result) => {
        if (!ignore) setExams(result)
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

  // 추가한 뒤 서버 정렬 그대로 다시 불러와 순서를 맞춘다
  const add = useCallback(async (input: NewMockExam) => {
    setError(null)
    try {
      await addMockExam(input)
      setExams(await fetchMockExams())
    } catch (e) {
      setError(toErrorMessage(e))
      return false
    }
    return true
  }, [])

  const remove = useCallback(async (id: string) => {
    setError(null)
    try {
      await deleteMockExam(id)
      setExams((prev) => prev.filter((exam) => exam.id !== id))
    } catch (e) {
      setError(toErrorMessage(e))
    }
  }, [])

  return { exams, loading, error, add, remove }
}
