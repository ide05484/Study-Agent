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

// timeZone 기준 시각(0~23)
export function localHour(date: Date, timeZone: string): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hourCycle: "h23",
  }).format(date);
  return Number(hour);
}

// 순공시간을 기록할 날짜. 새벽 0~3시 59분에 "오늘"이라고 보내면 전날로 센다
export function studyTimeDate(
  now: Date,
  timeZone: string,
  day: "today" | "yesterday",
): string {
  const today = toDateKey(now, timeZone);
  if (day === "yesterday") return addDays(today, -1);
  return localHour(now, timeZone) < 4 ? addDays(today, -1) : today;
}
