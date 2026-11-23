import { assert, assertEquals, assertNotEquals } from "jsr:@std/assert";
import type { TodayTaskLine } from "./context.ts";
import { CHEERS, TIME_AVAILABLE_QUESTION, welcomeText } from "./welcome.ts";

function task(title: string, over: Partial<TodayTaskLine> = {}): TodayTaskLine {
  return {
    subject: "korean",
    title,
    unit: "chapter",
    target_rounds: 1,
    round: 1,
    start_unit: 3,
    end_unit: 4,
    status: "pending",
    ...over,
  };
}

const TODAY = "2026-11-13";
const EXAM = "2027-06-14"; // 213일 뒤

Deno.test("분량이 있으면 남은 일수와 분량 한 줄, 가용 시간 질문을 붙인다", () => {
  const r = welcomeText({
    today: TODAY,
    examDate: EXAM,
    tasks: [task("가"), task("나"), task("다")],
  });
  const paragraphs = r.text.split("\n\n");
  assert(paragraphs[0].startsWith("시험까지 213일 남았어요."));
  assert(paragraphs[0].includes("가 3–4챕터, 나 3–4챕터, 다 3–4챕터"));
  assertEquals(paragraphs[paragraphs.length - 1], TIME_AVAILABLE_QUESTION);
  assertEquals(r.action, { kind: "time_available_ask" });
});

Deno.test("분량이 5개면 앞 4개와 외 1개", () => {
  const tasks = ["가", "나", "다", "라", "마"].map((t) => task(t));
  const r = welcomeText({ today: TODAY, examDate: EXAM, tasks });
  assert(r.text.includes("라 3–4챕터 외 1개."));
  assert(!r.text.includes("마 3–4챕터"));
});

Deno.test("목표 2회독 이상 교재는 회독을 앞에 붙인다", () => {
  const r = welcomeText({
    today: TODAY,
    examDate: EXAM,
    tasks: [task("가", { target_rounds: 2, round: 2 })],
  });
  assert(r.text.includes("가 2회독 3–4챕터"));
});

Deno.test("시험일이 없으면 안내 문구로 시작하고 질문이 없다", () => {
  const r = welcomeText({ today: TODAY, examDate: null, tasks: [task("가")] });
  assert(r.text.startsWith(
    "시험일을 정하면 오늘 분량을 나눠 드려요. 메뉴의 '공부 설정 변경'에서 정할 수 있어요.\n\n",
  ));
  assert(!r.text.includes(TIME_AVAILABLE_QUESTION));
  assertEquals(r.action, null);
});

Deno.test("시험일 지남·당일·분량 없음은 질문과 action이 없다", () => {
  const cases = [
    { examDate: "2026-11-12", tasks: [task("가")] },
    { examDate: TODAY, tasks: [task("가")] },
    { examDate: EXAM, tasks: [] },
  ];
  for (const c of cases) {
    const r = welcomeText({ today: TODAY, ...c });
    assertEquals(r.action, null);
    assert(!r.text.includes(TIME_AVAILABLE_QUESTION));
  }
  const none = welcomeText({ today: TODAY, examDate: EXAM, tasks: [] });
  assert(
    none.text.startsWith(
      "시험까지 213일 남았어요. 오늘은 배정된 분량이 없어요.\n\n",
    ),
  );
});

Deno.test("응원 문장은 날짜로만 정해지고 하루씩 돌아간다", () => {
  assertEquals(CHEERS.length, 7);
  const at = (today: string) =>
    welcomeText({ today, examDate: null, tasks: [] }).text;
  assertEquals(at("2026-11-13"), at("2026-11-13"));
  assertEquals(at("2026-11-13"), at("2026-11-20"));
  assertNotEquals(at("2026-11-13"), at("2026-11-14"));
});
