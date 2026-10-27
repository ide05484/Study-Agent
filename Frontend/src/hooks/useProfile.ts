import { useCallback, useEffect, useState } from 'react'
import { useOutletContext } from 'react-router'
import { regeneratePlan } from '../api/plan.ts'
import { fetchProfile, updateExamDate } from '../api/profile.ts'
import type { Profile } from '../interfaces/profile.ts'
import { toErrorMessage } from '../libs/errors.ts'
import { describePlanResult } from '../libs/plan.ts'

export interface ProfileState {
  profile: Profile | null
  error: string | null
  // 저장 후 계획을 다시 나누고 안내 문구를 돌려준다
  saveExamDate: (examDate: string | null) => Promise<string>
}

export function useProfile(): ProfileState {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    fetchProfile()
      .then((result) => {
        if (!ignore) setProfile(result)
      })
      .catch((e: unknown) => {
        if (!ignore) setError(toErrorMessage(e))
      })
    return () => {
      ignore = true
    }
  }, [])

  const saveExamDate = useCallback(
    async (examDate: string | null) => {
      if (!profile) throw new Error('로그인이 필요합니다.')
      await updateExamDate(profile.id, examDate)
      setProfile({ ...profile, exam_date: examDate })
      try {
        return describePlanResult(await regeneratePlan())
      } catch (e) {
        throw new Error(`시험일은 저장했지만 계획을 다시 나누지 못했어요. (${toErrorMessage(e)})`)
      }
    },
    [profile],
  )

  return { profile, error, saveExamDate }
}

// AppLayout이 Outlet context로 내려주는 프로필 (헤더 D-day와 공부 설정이 같은 상태를 본다)
export function useProfileContext(): ProfileState {
  return useOutletContext<ProfileState>()
}
