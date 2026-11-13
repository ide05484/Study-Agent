import { useEffect, useRef } from 'react'
import { regeneratePlan } from '../api/plan.ts'
import { hasMissedTasks } from '../api/study.ts'
import { addDays, todayKey } from '../libs/date.ts'

// 앱을 열 때 지난 날짜에 못 끝낸(pending) 분량이 있으면 남은 날로 계획을 다시 나눈다.
// plan-generator(replace_daily_tasks)가 지난 pending을 skipped로 바꾸므로 다음에 열 때는 다시 나누지 않는다.
// 다시 나누면 regeneratePlan이 알림을 보내 채팅의 오늘의 분량이 새로 불러진다.
// 앱이 열린 뒤 시험일을 처음 알게 됐을 때 한 번만 한다
export function useCarryOver(examDate: string | null): void {
  const checkedRef = useRef(false)

  useEffect(() => {
    if (!examDate || checkedRef.current) return
    const today = todayKey()
    // 시험 전날이 이미 지났으면 나눌 날이 없다
    if (addDays(examDate, -1) < today) return
    checkedRef.current = true
    hasMissedTasks(today)
      .then((missed) => (missed ? regeneratePlan() : undefined))
      .catch(() => {
        // 조용히 넘긴다. 지난 pending이 그대로 남아 다음에 앱을 열 때 다시 한다
      })
  }, [examDate])
}
