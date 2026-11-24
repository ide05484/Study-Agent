// 날짜 키(YYYY-MM-DD)는 앱 기준 시간대(Asia/Seoul)로 계산한다
// TODO: profiles.timezone 반영
const APP_TIMEZONE = 'Asia/Seoul'
const UTC_OFFSET = '+09:00' // Asia/Seoul은 서머타임이 없어 고정
const DAY_MS = 24 * 60 * 60 * 1000
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
// 공부 하루는 새벽 2시에 시작한다. 자정~1시 59분의 기록·체크·대화는 전날 것이다(서버 _shared/date.ts와 같은 값)
const DAY_START_HOUR = 2
const DAY_START_MS = DAY_START_HOUR * 60 * 60 * 1000

const keyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// 달력 날짜. 오늘·채팅방 날짜는 studyDayKey·todayKey를 쓴다
export function toDateKey(date: Date | string): string {
  return keyFormatter.format(typeof date === 'string' ? new Date(date) : date)
}

// 그 순간이 속한 공부 날짜(새벽 2시 전이면 전날)
export function studyDayKey(date: Date | string): string {
  const time = typeof date === 'string' ? new Date(date).getTime() : date.getTime()
  return toDateKey(new Date(time - DAY_START_MS))
}

// 오늘 = 공부 날짜. 오늘의 분량·이월·채팅방이 모두 이 값을 쓴다
export function todayKey(): string {
  return studyDayKey(new Date())
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

// 공부 날짜의 범위: 그날 새벽 2시 ~ 다음 날 새벽 2시 (timestamptz 비교용, 채팅방 메시지)
export function dayRange(key: string): [string, string] {
  const start = `T0${DAY_START_HOUR}:00:00${UTC_OFFSET}`
  return [`${key}${start}`, `${addDays(key, 1)}${start}`]
}

// 예) 10월 27일 (화)
export function formatDateTitle(key: string): string {
  const d = parseKey(key)
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${WEEKDAYS[d.getUTCDay()]})`
}

// 연도와 요일 없이. 예) 12월 31일
export function formatMonthDay(key: string): string {
  const d = parseKey(key)
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`
}

// 예) 2027년 2월 27일 (토)
export function formatFullDate(key: string): string {
  return `${key.slice(0, 4)}년 ${formatDateTitle(key)}`
}

// 그래프 축처럼 좁은 곳에 쓰는 짧은 날짜. 예) 2026-10-09 → 26.10.9
export function formatShortDate(key: string): string {
  const [year, month, day] = key.split('-')
  return `${year.slice(2)}.${Number(month)}.${Number(day)}`
}

// 달력(react-calendar)은 브라우저 시간대의 Date를 다루므로, 날짜 키와는 연·월·일 값으로만 바꾼다
export function keyToLocalDate(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function localDateToKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function formatDDay(examDate: string | null): string {
  if (!examDate) return 'D-?'
  const days = diffDays(todayKey(), examDate)
  if (days === 0) return 'D-DAY'
  return days > 0 ? `D-${days}` : `D+${-days}`
}
