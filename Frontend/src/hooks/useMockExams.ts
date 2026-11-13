import { useCallback, useEffect, useState } from 'react'
import { addMockExam, fetchMockExams } from '../api/exams.ts'
import type { MockExam, NewMockExam } from '../interfaces/mockExam.ts'
import { toErrorMessage } from '../libs/errors.ts'

export interface MockExamsState {
  exams: MockExam[]
  loading: boolean
  error: string | null
  // 성공하면 true. 실패 사유는 error로 노출한다
  add: (input: NewMockExam) => Promise<boolean>
}

// 공부 설정 화면의 시험 점수 관리(조회·추가, 삭제는 없음). 점수를 바꿔도 계획은 다시 나누지 않는다
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
    let created: MockExam
    try {
      created = await addMockExam(input)
    } catch (e) {
      setError(toErrorMessage(e))
      return false
    }
    // 저장은 끝났으므로 재조회가 실패해도 성공으로 본다(다시 누르면 중복 저장된다)
    try {
      setExams(await fetchMockExams())
    } catch {
      setExams((prev) =>
        [created, ...prev].sort((a, b) => (a.taken_on < b.taken_on ? 1 : a.taken_on > b.taken_on ? -1 : 0)),
      )
    }
    return true
  }, [])

  return { exams, loading, error, add }
}
