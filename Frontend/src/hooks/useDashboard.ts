import { useEffect, useState } from 'react'
import { fetchBooks, fetchDailyTasks, fetchStudyDates } from '../api/study.ts'
import type { Subject } from '../interfaces/subject.ts'
import type { Book, DailyTaskWithBook } from '../interfaces/study.ts'
import { addDays, startOfWeek, todayKey } from '../libs/date.ts'
import { toErrorMessage } from '../libs/errors.ts'
import { SUBJECTS } from '../libs/subjects.ts'

// 공부 잔디 표시 기간 (480px 폭 기준)
export const HEATMAP_WEEKS = 20

export type HeatLevel = 0 | 1 | 2 | 3 | 4

export interface HeatDay {
  date: string
  level: HeatLevel | null // null = 아직 오지 않은 날
}

export interface WeeklyGoal {
  subject: Subject
  pages: number
}

export interface SubjectProgress {
  subject: Subject
  percent: number
  remaining: Book[]
  hasBooks: boolean
}

export interface DashboardData {
  heat: HeatDay[]
  streak: number
  weekly: WeeklyGoal[]
  weeklyDone: number
  weeklyTotal: number
  subjects: SubjectProgress[]
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    const today = todayKey()
    const thisWeek = startOfWeek(today)
    const heatStart = addDays(thisWeek, -7 * (HEATMAP_WEEKS - 1))

    Promise.all([fetchBooks(), fetchDailyTasks(heatStart, addDays(thisWeek, 6)), fetchStudyDates()])
      .then(([books, tasks, studyDates]) => {
        if (ignore) return
        const studied = new Set(studyDates)
        const weekTasks = tasks.filter((t) => t.task_date >= thisWeek)
        setData({
          heat: buildHeat(heatStart, today, tasks, studied),
          streak: countStreak(studied, today),
          weekly: buildWeekly(weekTasks),
          weeklyDone: weekTasks.filter((t) => t.status === 'done').length,
          weeklyTotal: weekTasks.length,
          subjects: buildSubjects(books),
        })
      })
      .catch((e: unknown) => {
        if (!ignore) setError(toErrorMessage(e))
      })
    return () => {
      ignore = true
    }
  }, [])

  return { data, error }
}

function buildHeat(start: string, today: string, tasks: DailyTaskWithBook[], studied: Set<string>): HeatDay[] {
  const byDate = new Map<string, DailyTaskWithBook[]>()
  for (const t of tasks) byDate.set(t.task_date, [...(byDate.get(t.task_date) ?? []), t])
  return Array.from({ length: HEATMAP_WEEKS * 7 }, (_, i) => {
    const date = addDays(start, i)
    return { date, level: date > today ? null : heatLevel(byDate.get(date) ?? [], studied.has(date)) }
  })
}

// 그날 계획(daily_tasks) 대비 달성률을 5단계로 나눈다
function heatLevel(tasks: DailyTaskWithBook[], studied: boolean): HeatLevel {
  // 계획이 없는 날은 공부 기록이 있으면 달성으로 본다
  if (tasks.length === 0) return studied ? 4 : 0
  const score =
    tasks.reduce((sum, t) => sum + (t.status === 'done' ? 1 : t.status === 'partial' ? 0.5 : 0), 0) / tasks.length
  if (score >= 1) return 4
  if (score > 0.5) return 3
  if (score > 0.25) return 2
  if (score > 0 || studied) return 1
  return 0
}

// 오늘 기록이 아직 없으면 어제까지 이어진 기록을 센다
function countStreak(studied: Set<string>, today: string): number {
  let day = studied.has(today) ? today : addDays(today, -1)
  let count = 0
  while (studied.has(day)) {
    count++
    day = addDays(day, -1)
  }
  return count
}

function buildWeekly(tasks: DailyTaskWithBook[]): WeeklyGoal[] {
  return SUBJECTS.map((subject) => ({
    subject,
    pages: tasks
      .filter((t) => t.book.subject === subject)
      .reduce((sum, t) => sum + t.end_page - t.start_page + 1, 0),
  })).filter((goal) => goal.pages > 0)
}

function buildSubjects(books: Book[]): SubjectProgress[] {
  return SUBJECTS.map((subject) => {
    const own = books.filter((b) => b.subject === subject)
    const total = own.reduce((sum, b) => sum + b.total_pages, 0)
    const done = own.reduce((sum, b) => sum + Math.min(b.current_page, b.total_pages), 0)
    return {
      subject,
      percent: total === 0 ? 0 : Math.round((done / total) * 100),
      remaining: own.filter((b) => b.current_page < b.total_pages),
      hasBooks: own.length > 0,
    }
  })
}
