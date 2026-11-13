import { assertEquals, assertStringIncludes } from "jsr:@std/assert";
import type { CoachContext } from "./context.ts";
import { fallbackReply, replyInstructions, studyTimeReply } from "./reply.ts";

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

Deno.test("replyInstructions: intent와 순공시간", () => {
  assertStringIncludes(
    replyInstructions("schedule", null),
    "조정했다고 말하지 않는다",
  );
  assertStringIncludes(
    replyInstructions("study_log", "4시간"),
    "순공시간 4시간",
  );
});
