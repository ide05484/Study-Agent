import { assertEquals, assertStringIncludes } from "jsr:@std/assert";
import { HARD_TIMES_INSTRUCTIONS } from "../_shared/coach.ts";
import type { CoachContext } from "./context.ts";
import {
  fallbackReply,
  replyInstructions,
  type ReplyOptions,
  savedStudyTimeLabel,
  studyTimeReply,
  tipSavedReply,
} from "./reply.ts";

const ctx: CoachContext = {
  today: "2026-11-13",
  examDate: null,
  books: [
    {
      subject: "health_admin",
      title: "기본서",
      unit: "session",
      total_units: 60,
      current_round: 1,
      current_unit: 15,
      target_rounds: 2,
    },
  ],
  todayTasks: [],
  recentLogs: [],
  mockExams: [],
};

Deno.test("fallbackReply: 기록이 있을 때", () => {
  assertEquals(
    fallbackReply([{ subject: "health_admin", title: "기본서" }], ctx),
    "기록했어요. 보건행정 진도 13%. 오늘도 수고했어요.",
  );
});

Deno.test("fallbackReply: 기록이 없을 때", () => {
  assertEquals(
    fallbackReply([], ctx),
    "지금은 답변을 만들지 못했어요. 잠시 후 다시 보내주세요.",
  );
});

Deno.test("fallbackReply: 기록 없이 순공시간만 저장했을 때", () => {
  assertEquals(
    fallbackReply([], ctx, { total: 200, date: "2026-11-12" }),
    "11월 12일 순공 3시간 20분으로 적어 뒀어요. 수고 많으셨어요. 질문 답변은 지금 만들지 못했어요. 잠시 후 다시 물어봐 주세요.",
  );
});

Deno.test("fallbackReply: 기록과 순공시간을 함께 저장했을 때", () => {
  assertEquals(
    fallbackReply([{ subject: "health_admin", title: "기본서" }], ctx, {
      total: 240,
      date: "2026-11-13",
    }),
    "기록했어요. 보건행정 진도 13%, 오늘 순공 4시간도 적어 뒀어요. 오늘도 수고했어요.",
  );
  assertEquals(
    fallbackReply([{ subject: "health_admin", title: "기본서" }], ctx, {
      total: 300,
      date: "2026-11-12",
    }),
    "기록했어요. 보건행정 진도 13%, 11월 12일 순공 5시간도 적어 뒀어요. 오늘도 수고했어요.",
  );
});

Deno.test("savedStudyTimeLabel: 오늘과 다른 날", () => {
  assertEquals(
    savedStudyTimeLabel(260, "2026-11-13", "2026-11-13"),
    "오늘 합계 4시간 20분",
  );
  assertEquals(
    savedStudyTimeLabel(260, "2026-11-12", "2026-11-13"),
    "11월 12일 합계 4시간 20분",
  );
});

Deno.test("studyTimeReply: 오늘과 다른 날", () => {
  assertEquals(
    studyTimeReply(200, "2026-11-13", "2026-11-13"),
    "오늘 순공 3시간 20분으로 적어 뒀어요. 오늘도 수고 많으셨어요.",
  );
  assertEquals(
    studyTimeReply(180, "2026-11-05", "2026-11-13"),
    "11월 5일 순공 3시간으로 적어 뒀어요. 수고 많으셨어요.",
  );
});

const NO_OPTIONS: ReplyOptions = {
  savedStudyTime: null,
  hasKnowledge: false,
  hasTips: false,
  hardTimes: false,
  savedTip: null,
};

Deno.test("replyInstructions: intent와 순공시간", () => {
  assertStringIncludes(
    replyInstructions("schedule", NO_OPTIONS),
    "조정했다고 말하지 않는다",
  );
  assertStringIncludes(
    replyInstructions("study_log", {
      ...NO_OPTIONS,
      savedStudyTime: "오늘 합계 4시간",
    }),
    "이번 메시지로 순공시간을 적어 뒀다(오늘 합계 4시간).",
  );
});

Deno.test("replyInstructions: 지식, 팁, 힘들 때, 저장한 방법", () => {
  const plain = replyInstructions("question", NO_OPTIONS);
  assertEquals(plain.includes("아래 공부법은 참고 자료다."), false);
  assertEquals(plain.includes(HARD_TIMES_INSTRUCTIONS), false);

  const text = replyInstructions("question", {
    ...NO_OPTIONS,
    hasKnowledge: true,
    hasTips: true,
    hardTimes: true,
    savedTip: { subject: "public_health", content: "백지 복기" },
  });
  assertStringIncludes(
    text,
    "아래 공부법은 참고 자료다. 질문에 맞는 것 1~2개만 고르고, 통째로 옮기지 않는다. 출처나 강사 이름을 말하지 않는다.",
  );
  assertStringIncludes(
    text,
    "이 수험생에게 잘 맞았던 방법이다. 맞으면 먼저 이걸 살려서 제안한다.",
  );
  assertStringIncludes(text, HARD_TIMES_INSTRUCTIONS);
  assertStringIncludes(
    text,
    "이번 메시지의 방법을 '공중보건 공부법'에 적어 뒀다. 한 문장으로 알려 준다.",
  );
  assertStringIncludes(
    replyInstructions("question", {
      ...NO_OPTIONS,
      savedTip: { subject: null, content: "백지 복기" },
    }),
    "이번 메시지의 방법을 '공부법'에 적어 뒀다. 한 문장으로 알려 준다.",
  );
});

Deno.test("tipSavedReply: 과목이 있을 때와 없을 때", () => {
  assertEquals(
    tipSavedReply("public_health"),
    "잘 맞은 방법은 공중보건 공부법에 적어 뒀어요.",
  );
  assertEquals(tipSavedReply(null), "잘 맞은 방법은 공부법에 적어 뒀어요.");
});

Deno.test("fallbackReply: 잘 맞은 방법을 저장했을 때", () => {
  const tip = { subject: "public_health" as const, content: "백지 복기" };
  assertEquals(
    fallbackReply(
      [{ subject: "health_admin", title: "기본서" }],
      ctx,
      null,
      tip,
    ),
    "기록했어요. 보건행정 진도 13%. 오늘도 수고했어요. 잘 맞은 방법은 공중보건 공부법에 적어 뒀어요.",
  );
  assertEquals(
    fallbackReply([], ctx, null, tip),
    "잘 맞은 방법은 공중보건 공부법에 적어 뒀어요. 질문 답변은 지금 만들지 못했어요. 잠시 후 다시 물어봐 주세요.",
  );
});

Deno.test("fallbackReply: 순공시간과 잘 맞은 방법을 함께 저장했을 때", () => {
  const tip = { subject: "public_health" as const, content: "백지 복기" };
  assertEquals(
    fallbackReply([], ctx, { total: 200, date: ctx.today }, tip),
    "오늘 순공 3시간 20분으로 적어 뒀어요. 오늘도 수고 많으셨어요. 잘 맞은 방법은 공중보건 공부법에 적어 뒀어요. 질문 답변은 지금 만들지 못했어요. 잠시 후 다시 물어봐 주세요.",
  );
  assertEquals(
    fallbackReply(
      [{ subject: "health_admin", title: "기본서" }],
      ctx,
      { total: 240, date: ctx.today },
      tip,
    ),
    "기록했어요. 보건행정 진도 13%, 오늘 순공 4시간도 적어 뒀어요. 오늘도 수고했어요. 잘 맞은 방법은 공중보건 공부법에 적어 뒀어요.",
  );
});
