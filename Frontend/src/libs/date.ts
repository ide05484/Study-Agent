// 날짜 키(YYYY-MM-DD)는 앱 기준 시간대(Asia/Seoul)로 계산한다
// TODO: profiles.timezone 반영
const APP_TIMEZONE = 'Asia/Seoul'
const UTC_OFFSET = '+09:00' // Asia/Seoul은 서머타임이 없어 고정
const DAY_MS = 24 * 60 * 60 * 1000
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const keyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function toDateKey(date: Date | string): string {
  return keyFormatter.format(typeof date === 'string' ? new Date(date) : date)
}

export function todayKey(): string {
  return toDateKey(new Date())
}

export function isDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseKey(value).getTime())
}

// 날짜 키 산술은 시간대 영향을 받지 않도록 UTC 자정 기준으로 한다
function parseKey(key: string): Date {
  return new Date(`${key}T00:00:00Z`)
}

export function addDays(key: string, days: number): string {
  const d = parseKey(key)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function diffDays(from: string, to: string): number {
  return Math.round((parseKey(to).getTime() - parseKey(from).getTime()) / DAY_MS)
}

// 월요일 시작 주의 첫날
export function startOfWeek(key: string): string {
  return addDays(key, -((parseKey(key).getUTCDay() + 6) % 7))
}

// 그날 0시 ~ 다음 날 0시 (timestamptz 비교용)
export function dayRange(key: string): [string, string] {
  return [`${key}T00:00:00${UTC_OFFSET}`, `${addDays(key, 1)}T00:00:00${UTC_OFFSET}`]
}

// 예) 10월 27일 (화)
export function formatDateTitle(key: string): string {
  const d = parseKey(key)
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${WEEKDAYS[d.getUTCDay()]})`
}

export function formatDDay(examDate: string | null): string {
  if (!examDate) return 'D-?'
  const days = diffDays(todayKey(), examDate)
  if (days === 0) return 'D-DAY'
  return days > 0 ? `D-${days}` : `D+${-days}`
}
