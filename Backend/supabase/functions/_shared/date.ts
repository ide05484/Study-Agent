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
  return Math.round((parseKey(to).getTime() - parseKey(from).getTime()) / DAY_MS);
}
