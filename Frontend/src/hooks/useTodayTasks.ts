import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchDailyTasks, setTaskDone } from '../api/study.ts'
import type { DailyTaskWithBook, TaskStatus } from '../interfaces/study.ts'
import { toErrorMessage } from '../libs/errors.ts'
import { onPlanChanged } from '../libs/planEvents.ts'
import { SUBJECTS } from '../libs/subjects.ts'

const TOGGLE_ERROR_MESSAGE = '저장하지 못했어요. 다시 눌러 주세요.'

const EMPTY_IDS: ReadonlySet<string> = new Set()

function sortBySubject(tasks: DailyTaskWithBook[]): DailyTaskWithBook[] {
  return tasks.toSorted((a, b) => SUBJECTS.indexOf(a.book.subject) - SUBJECTS.indexOf(b.book.subject))
}

interface TodayTasksState {
  tasks: DailyTaskWithBook[] | null
  error: string | null
  reload: () => void
  toggle: (taskId: string, done: boolean) => Promise<void>
  savingIds: ReadonlySet<string>
  toggleError: string | null
  clearToggleError: () => void
}

// 채팅의 "오늘의 분량": date 하루의 계획을 과목 순서대로, 체크로 끝냄/안 끝냄을 바꾼다
export function useTodayTasks(date: string): TodayTasksState {
  const [tasks, setTasks] = useState<DailyTaskWithBook[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savingIds, setSavingIds] = useState<ReadonlySet<string>>(EMPTY_IDS)
  const [toggleError, setToggleError] = useState<string | null>(null)

  // 늦게 도착한 옛 응답이 새 응답을 덮지 않도록 마지막 요청만 반영한다
  const requestRef = useRef(0)
  // reload가 돌아올 때 저장 중인 줄은 화면의 낙관적 상태를 유지하려고 최신 값을 ref로도 둔다
  const savingRef = useRef<ReadonlySet<string>>(EMPTY_IDS)
  const tasksRef = useRef<DailyTaskWithBook[] | null>(null)

  const applyTasks = useCallback((next: DailyTaskWithBook[] | null) => {
    tasksRef.current = next
    setTasks(next)
  }, [])

  const updateSaving = useCallback((update: (ids: Set<string>) => void) => {
    const next = new Set(savingRef.current)
    update(next)
    savingRef.current = next
    setSavingIds(next)
  }, [])

  const load = useCallback(() => {
    const request = ++requestRef.current
    fetchDailyTasks(date, date)
      .then((result) => {
        if (request !== requestRef.current) return
        const current = tasksRef.current
        const merged = result.map((task) => {
          if (!savingRef.current.has(task.id)) return task
          const optimistic = current?.find((t) => t.id === task.id)
          return optimistic ? { ...task, status: optimistic.status } : task
        })
        setError(null)
        applyTasks(sortBySubject(merged))
      })
      .catch((e: unknown) => {
        if (request !== requestRef.current) return
        // 이미 보이는 분량이 있으면 그대로 둔다. 처음 불러오기만 오류로 보인다
        if (tasksRef.current === null) setError(toErrorMessage(e))
      })
  }, [date, applyTasks])

  // 오류 상태에서 다시 불러오기를 누르면 오류를 바로 비운다
  const reload = useCallback(() => {
    setError(null)
    load()
  }, [load])

  useEffect(() => {
    const requests = requestRef
    load()
    const unsubscribe = onPlanChanged(load)
    return () => {
      unsubscribe()
      requests.current++ // 언마운트·날짜 변경 뒤 도착하는 응답은 버린다
    }
  }, [load])

  const clearToggleError = useCallback(() => setToggleError(null), [])

  const toggle = useCallback(
    async (taskId: string, done: boolean) => {
      if (savingRef.current.has(taskId)) return
      const before = tasksRef.current?.find((t) => t.id === taskId)?.status
      if (before === undefined) return
      const optimistic: TaskStatus = done ? 'done' : 'pending'
      const setStatus = (status: TaskStatus) =>
        applyTasks(tasksRef.current?.map((t) => (t.id === taskId ? { ...t, status } : t)) ?? null)

      setToggleError(null)
      setStatus(optimistic)
      updateSaving((ids) => ids.add(taskId))
      try {
        await setTaskDone(taskId, done)
        updateSaving((ids) => ids.delete(taskId))
        load()
      } catch {
        setStatus(before) // 다시 불러오기가 실패할 때를 위한 임시 값
        updateSaving((ids) => ids.delete(taskId))
        setToggleError(TOGGLE_ERROR_MESSAGE)
        load() // 서버 상태(연쇄로 바뀐 줄, 사라진 분량)에 맞춘다
      }
    },
    [applyTasks, updateSaving, load],
  )

  return { tasks, error, reload, toggle, savingIds, toggleError, clearToggleError }
}
