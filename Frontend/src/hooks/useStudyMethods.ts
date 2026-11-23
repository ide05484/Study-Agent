import { useCallback, useEffect, useState } from 'react'
import { deleteStudyTip, fetchStudyMethodSections, fetchStudyTips } from '../api/studyMethods.ts'
import type { StudyMethodSection, StudyTip } from '../interfaces/studyMethod.ts'
import { toErrorMessage } from '../libs/errors.ts'

export interface StudyMethodsState {
  sections: StudyMethodSection[]
  tips: StudyTip[]
  loading: boolean
  error: string | null
  // 성공하면 true. 실패 사유는 error로 노출한다
  removeTip: (id: string) => Promise<boolean>
}

// 공부 설정 "과목별 공부법" 탭: DB 공부법과 내게 잘 맞은 방법(조회, 팁 삭제)
export function useStudyMethods(): StudyMethodsState {
  const [sections, setSections] = useState<StudyMethodSection[]>([])
  const [tips, setTips] = useState<StudyTip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    Promise.all([fetchStudyMethodSections(), fetchStudyTips()])
      .then(([loadedSections, loadedTips]) => {
        if (ignore) return
        setSections(loadedSections)
        setTips(loadedTips)
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

  const removeTip = useCallback(async (id: string) => {
    setError(null)
    try {
      await deleteStudyTip(id)
    } catch {
      setError('지우지 못했어요. 다시 눌러 주세요.')
      return false
    }
    setTips((prev) => prev.filter((tip) => tip.id !== id))
    return true
  }, [])

  return { sections, tips, loading, error, removeTip }
}
