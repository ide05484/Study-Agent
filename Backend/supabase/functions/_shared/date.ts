// 날짜 키(YYYY-MM-DD) 유틸. 키 산술은 시간대 영향을 받지 않도록 UTC 자정 기준으로 한다.
const DAY_MS = 24 * 60 * 60 * 1000;

export function toDateKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function parseKey(key: string): Date {
  return new Date(`${key}T00:00:00Z`);
}

export function addDays(key: string, days: number): string {
  const d = parseKey(key);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function diffDays(from: string, to: string): number {
  return Math.round(
    (parseKey(to).getTime() - parseKey(from).getTime()) / DAY_MS,
  );
}

// date 순간에 timeZone이 UTC보다 앞선 밀리초(서울은 +9시간)
function offsetMs(date: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hourCycle: "h23",
    }).formatToParts(date).map((p) => [p.type, Number(p.value)]),
  );
  const local = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return local - Math.floor(date.getTime() / 1000) * 1000;
}

// 공부 하루는 새벽 2시에 시작한다. 자정~1시 59분의 기록(채팅 보고·순공시간·분량 체크)과 대화는 전날 것이다.
// 새벽 재분배(아침 알림 단계)는 이 경계 뒤인 2~4시에 돈다. 화면(Frontend/src/libs/date.ts)과 같은 값이어야 한다
export const DAY_START_HOUR = 2;
const DAY_START_MS = DAY_START_HOUR * 60 * 60 * 1000;

// date 순간이 속한 공부 날짜. 오늘 채팅방·오늘 분량·기록 날짜는 모두 이 값을 쓴다
export function studyDayKey(date: Date, timeZone: string): string {
  return toDateKey(new Date(date.getTime() - DAY_START_MS), timeZone);
}

// 공부 날짜의 시작(그 날 timeZone 새벽 2시)을 UTC ISO 문자열로. created_at으로 그날 메시지를 거를 때 쓴다
export function dayStartUtc(key: string, timeZone: string): string {
  const midnight = parseKey(key).getTime();
  let start = midnight - offsetMs(new Date(midnight), timeZone);
  // 서머타임 경계에서는 자정 무렵의 오프셋으로 한 번 더 맞춘다
  start = midnight - offsetMs(new Date(start), timeZone);
  return new Date(start + DAY_START_MS).toISOString();
}

// 순공시간을 기록할 날짜. "오늘"은 공부 날짜(새벽 2시 전이면 전날), "어제"는 그 하루 전
export function studyTimeDate(
  now: Date,
  timeZone: string,
  day: "today" | "yesterday",
): string {
  const today = studyDayKey(now, timeZone);
  return day === "yesterday" ? addDays(today, -1) : today;
}

// "2026-11-13" → "11월 13일"
function monthDayLabel(date: string): string {
  const [, month, day] = date.split("-").map(Number);
  return `${month}월 ${day}일`;
}

// 오늘이면 "오늘", 아니면 "11월 13일"
export function dayLabel(date: string, today: string): string {
  return date === today ? "오늘" : monthDayLabel(date);
}
