import { assertEquals } from "jsr:@std/assert";
import {
  formatKnowledge,
  type KnowledgeSection,
  knowledgeTopics,
  loadsTips,
  TIP_LIMIT,
} from "./knowledge.ts";

Deno.test("knowledgeTopics: 질문이면 과목과 지식, 그 밖에는 지식만", () => {
  assertEquals(knowledgeTopics("question", "english", ["mental"]), [
    "english",
    "mental",
  ]);
  assertEquals(knowledgeTopics("question", null, []), []);
  assertEquals(knowledgeTopics("study_log", "english", []), []);
  assertEquals(knowledgeTopics("schedule", null, ["time"]), ["time"]);
});

Deno.test("loadsTips: 질문일 때만", () => {
  assertEquals(loadsTips("question"), true);
  assertEquals(loadsTips("study_log"), false);
  assertEquals(loadsTips("schedule"), false);
  assertEquals(TIP_LIMIT, 5);
});

Deno.test("formatKnowledge: 공부법과 잘 맞았던 방법", () => {
  const sections: KnowledgeSection[] = [
    {
      topic: "public_health",
      heading: "고민별 처방",
      kind: "pairs",
      items: [{ label: "외울 게 많음", text: "==기출 표==부터" }],
    },
  ];
  assertEquals(
    formatKnowledge(sections, ["백지 복기하기"]),
    [
      "[공중보건 공부법]",
      "고민별 처방",
      "- 외울 게 많음: 기출 표부터",
      "",
      "[이 수험생에게 잘 맞았던 방법]",
      "- 백지 복기하기",
    ].join("\n"),
  );
});

Deno.test("formatKnowledge: topic이 바뀔 때마다 제목, list 섹션", () => {
  const sections: KnowledgeSection[] = [
    {
      topic: "mental",
      heading: "불안할 때",
      kind: "list",
      items: ["**숨** 쉬기"],
    },
    { topic: "mental", heading: "잠", kind: "list", items: ["일찍 자기"] },
    { topic: "time", heading: "계획", kind: "list", items: ["하루 3개"] },
  ];
  assertEquals(
    formatKnowledge(sections, []),
    [
      "[멘탈관리]",
      "불안할 때",
      "- 숨 쉬기",
      "잠",
      "- 일찍 자기",
      "",
      "[시간관리]",
      "계획",
      "- 하루 3개",
    ].join("\n"),
  );
});

Deno.test("formatKnowledge: 둘 다 비면 빈 문자열", () => {
  assertEquals(formatKnowledge([], []), "");
});
