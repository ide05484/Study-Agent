import { useEffect, useState } from 'react'
import { fetchDailyTasks } from '../api/study.ts'
import type { DailyTaskWithBook } from '../interfaces/study.ts'
import { toErrorMessage } from '../libs/errors.ts'
import { SUBJECTS } from '../libs/subjects.ts'

// 채팅방 상단 "오늘의 분량": date 하루의 계획을 과목 순서대로
export function useTodayTasks(date: string) {
  const [tasks, setTasks] = useState<DailyTaskWithBook[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    fetchDailyTasks(date, date)
      .then((result) => {
        if (!ignore) {
          setTasks(result.toSorted((a, b) => SUBJECTS.indexOf(a.book.subject) - SUBJECTS.indexOf(b.book.subject)))
        }
      })
      .catch((e: unknown) => {
        if (!ignore) setError(toErrorMessage(e))
      })
    return () => {
      ignore = true
    }
  }, [date])

  return { tasks, error }
}
