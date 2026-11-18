import { useEffect, useState } from 'react'
import { fetchBooks, fetchDailyTasks, fetchStudyDates, fetchStudyTime } from '../api/study.ts'
import type { Subject } from '../interfaces/subject.ts'
import type { Book, BookUnit, DailyTaskWithBook } from '../interfaces/study.ts'
import { completedUnits, isBookFinished } from '../libs/books.ts'
import { addDays, startOfWeek, todayKey } from '../libs/date.ts'
import { toErrorMessage } from '../libs/errors.ts'
import { studyTimeLevel } from '../libs/studyTime.ts'
import { SUBJECTS } from '../libs/subjects.ts'

// 공부 잔디 표시 기간 (480px 폭 기준)
export const HEATMAP_WEEKS = 20
// 연속 공부를 세는 최대 날 수(시험 주기 1년)
const STREAK_MAX_DAYS = 365

export type HeatLevel = 0 | 1 | 2 | 3 | 4

export type HeatDay =
  | { date: string; kind: 'future' }
  | { date: string; kind: 'empty' }
  | { date: string; kind: 'time'; minutes: number; level: 1 | 2 | 3 | 4 }
  | { date: string; kind: 'dot'; percent: number | null } // null = 분량 진행 없이 공부 기록만

// 과목별 이번주 분량. 단위가 섞이면 단위마다 합계(예: 10회 · Day 7)
export interface WeeklyGoal {
  subject: Subject
  amounts: { unit: BookUnit; amount: number }[]
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

export function useDashboard(): { data: DashboardData | null; error: string | null } {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    const today = todayKey()
    const thisWeek = startOfWeek(today)
    const heatStart = addDays(thisWeek, -7 * (HEATMAP_WEEKS - 1))

    const heatEnd = addDays(thisWeek, 6)

    // 연속 공부는 시험 주기(1년)까지만 센다. 학습 기록·순공시간은 이 기간을 한 번에 받아 잔디에도 쓴다
    const streakStart = addDays(today, -(STREAK_MAX_DAYS - 1))
    const from = streakStart < heatStart ? streakStart : heatStart

    Promise.all([
      fetchBooks(),
      fetchDailyTasks(heatStart, heatEnd),
      fetchStudyDates(from, heatEnd),
      fetchStudyTime(from, heatEnd),
    ])
      .then(([books, tasks, studyDates, studyTime]) => {
        if (ignore) return
        const weekTasks = tasks.filter((t) => t.task_date >= thisWeek)
        const studied = new Set(studyDates)
        const heat = buildHeat(heatStart, today, tasks, studied, studyTime)
        const studiedDates = new Set([...studyDates, ...studyTime.map((row) => row.study_date)])
        setData({
          heat,
          streak: countStreak(heat, today, studiedDates, streakStart),
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

function buildHeat(
  start: string,
  today: string,
  tasks: DailyTaskWithBook[],
  studied: Set<string>,
  studyTime: { study_date: string; minutes: number }[],
): HeatDay[] {
  const byDate = new Map<string, DailyTaskWithBook[]>()
  for (const t of tasks) byDate.set(t.task_date, [...(byDate.get(t.task_date) ?? []), t])
  const minutesByDate = new Map(studyTime.map((row) => [row.study_date, row.minutes]))
  return Array.from({ length: HEATMAP_WEEKS * 7 }, (_, i) => {
    const date = addDays(start, i)
    if (date > today) return { date, kind: 'future' }
    return heatDay(date, minutesByDate.get(date), byDate.get(date) ?? [], studied.has(date))
  })
}

// 순공시간이 있으면 그 시간으로, 없으면 분량 진행률로 점을 찍는다
function heatDay(date: string, minutes: number | undefined, tasks: DailyTaskWithBook[], studied: boolean): HeatDay {
  if (minutes !== undefined) return { date, kind: 'time', minutes, level: studyTimeLevel(minutes) }
  const progress =
    tasks.length === 0
      ? 0
      : tasks.reduce((sum, t) => sum + (t.status === 'done' ? 1 : t.status === 'partial' ? 0.5 : 0), 0) / tasks.length
  if (progress > 0) return { date, kind: 'dot', percent: Math.round(progress * 100) }
  if (studied) return { date, kind: 'dot', percent: null }
  return { date, kind: 'empty' }
}

// 순공시간이나 점이 있는 날을 센다. 오늘이 비어 있으면 어제까지 이어진 날을 센다.
// 잔디 첫날보다 앞은 공부한 날짜(study_logs ∪ study_time)로 이어 세고, start(1년 전)에서 멈춘다
function countStreak(heat: HeatDay[], today: string, studiedDates: Set<string>, start: string): number {
  const byDate = new Map(heat.map((day) => [day.date, day]))
  const heatStart = heat[0].date
  const isStudied = (date: string) => {
    if (date < start) return false
    if (date < heatStart) return studiedDates.has(date)
    const kind = byDate.get(date)?.kind
    return kind === 'time' || kind === 'dot'
  }
  let day = isStudied(today) ? today : addDays(today, -1)
  let count = 0
  while (count < STREAK_MAX_DAYS && isStudied(day)) {
    count++
    day = addDays(day, -1)
  }
  return count
}

const WEEKLY_UNIT_ORDER: BookUnit[] = ['session', 'chapter', 'day']

// 이번주 목표량은 서로 다른 단위를 더하지 않고 단위마다 센다
function buildWeekly(tasks: DailyTaskWithBook[]): WeeklyGoal[] {
  return SUBJECTS.map((subject) => {
    const own = tasks.filter((t) => t.book.subject === subject)
    const amounts = WEEKLY_UNIT_ORDER.map((unit) => ({
      unit,
      amount: own.filter((t) => t.book.unit === unit).reduce((sum, t) => sum + t.end_unit - t.start_unit + 1, 0),
    })).filter((entry) => entry.amount > 0)
    return { subject, amounts }
  }).filter((goal) => goal.amounts.length > 0)
}

// 진도율은 목표 회독 기준이다. 회차·챕터·Day를 같은 단위로 더한다(영어 단어 60 Day는 영향이 작다)
function buildSubjects(books: Book[]): SubjectProgress[] {
  return SUBJECTS.map((subject) => {
    const own = books.filter((b) => b.subject === subject)
    const total = own.reduce((sum, b) => sum + b.target_rounds * b.total_units, 0)
    const done = own.reduce((sum, b) => sum + completedUnits(b), 0)
    return {
      subject,
      percent: total === 0 ? 0 : Math.round((done / total) * 100),
      remaining: own.filter((b) => !isBookFinished(b)),
      hasBooks: own.length > 0,
    }
  })
}
