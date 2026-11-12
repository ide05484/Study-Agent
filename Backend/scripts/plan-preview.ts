// DB 없이 Mock JSON으로 계획을 계산해 보여 준다. plan-generator와 같은 planBook을 쓴다.
//
// 사용: npm run plan:preview -- [JSON 경로] [--today YYYY-MM-DD]
import { addDays, diffDays, toDateKey } from "../supabase/functions/_shared/date.ts";
import { completedUnits, type PlannedTask, planBook } from "../supabase/functions/_shared/plan.ts";
import { SUBJECT_LABELS, type Subject } from "../supabase/functions/_shared/subjects.ts";
import { loadMock, resolveMockPath } from "./mock/load.ts";

const PREVIEW_WEEKS = 4;
const UNIT_SUFFIX = { day: "Day", chapter: "챕터", session: "회" } as const;

const USAGE = "사용: npm run plan:preview -- [JSON 경로] [--today YYYY-MM-DD]";

const args = process.argv.slice(2);
let today = toDateKey(new Date(), "Asia/Seoul");
const todayIndex = args.indexOf("--today");
if (todayIndex >= 0) {
  const [, value] = args.splice(todayIndex, 2);
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    console.error(USAGE);
    process.exit(1);
  }
  today = value;
}
const unknownOption = args.find((arg) => arg.startsWith("--"));
if (unknownOption || args.length > 1) {
  console.error(USAGE);
  process.exit(1);
}
const jsonPath = args[0];

const mock = loadMock(resolveMockPath(jsonPath));
const days = diffDays(today, mock.exam_date);
const subjects = Object.keys(SUBJECT_LABELS) as Subject[];

console.log(`기준일 ${today} · 시험일 ${mock.exam_date} · 공부 ${Math.max(days, 0)}일 (시험 전날까지)`);
if (days <= 0) process.exit(0);

const amount = (t: PlannedTask) => t.end_unit - t.start_unit + 1;
const unitTotals = new Array<number>(days).fill(0); // 회차·챕터
const dayTotals = new Array<number>(days).fill(0);
const weekly = Array.from({ length: PREVIEW_WEEKS }, () => new Map<Subject, number>());

console.log("\n[교재] 과목 | 교재 | 남은 분량 | 하루 평균 | 회독별 끝나는 날 | 못 끝낸 분량");
mock.books.forEach((book, i) => {
  const planBookInput = { ...book, id: String(i) };
  const tasks = planBook(planBookInput, days);
  const unit = UNIT_SUFFIX[book.unit];
  const remaining = book.target_rounds * book.total_units - completedUnits(planBookInput);
  const planned = tasks.reduce((sum, t) => sum + amount(t), 0);

  const roundEnds = new Map<number, number>();
  for (const t of tasks) {
    if (t.end_unit === book.total_units) roundEnds.set(t.round, t.day);
    (book.unit === "day" ? dayTotals : unitTotals)[t.day] += amount(t);
    const week = Math.floor(t.day / 7);
    if (book.unit !== "day" && week < PREVIEW_WEEKS) {
      weekly[week].set(book.subject, (weekly[week].get(book.subject) ?? 0) + amount(t));
    }
  }
  const ends = [...roundEnds].map(([round, day]) => `${round}회독 ${addDays(today, day)}`).join(", ") || "—";

  console.log(
    [
      SUBJECT_LABELS[book.subject],
      book.title,
      `${remaining}${unit}`,
      `${(planned / days).toFixed(1)}${unit}`,
      ends,
      remaining - planned > 0 ? `${remaining - planned}${unit}` : "—",
    ].join(" | "),
  );
});

const stats = (values: number[]) => {
  const sum = values.reduce((a, b) => a + b, 0);
  return `평균 ${(sum / values.length).toFixed(1)} · 최소 ${Math.min(...values)} · 최대 ${Math.max(...values)}`;
};
console.log(`\n[하루 총량] 회차·챕터: ${stats(unitTotals)} / Day: ${stats(dayTotals)}`);

console.log(`\n[앞 ${PREVIEW_WEEKS}주 과목별 회차·챕터 수] 주 시작일 | ${subjects.map((s) => SUBJECT_LABELS[s]).join(" | ")}`);
weekly.forEach((week, w) => {
  console.log([addDays(today, w * 7), ...subjects.map((s) => week.get(s) ?? 0)].join(" | "));
});
