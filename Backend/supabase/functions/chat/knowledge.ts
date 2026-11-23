import {
  METHOD_TOPIC_LABELS,
  type MethodSection,
  type MethodTopic,
  stripMarks,
} from "../_shared/methods.ts";
import type { Subject } from "../_shared/subjects.ts";
import type { Intent, Knowledge } from "./analysis.ts";

// 코치 답변 프롬프트에 넣을 공부법 지식 글. OpenAI·Supabase를 import하지 않는 순수 모듈이다.

export type KnowledgeSection = MethodSection & { topic: MethodTopic };

// 프롬프트에 넣는 잘 맞았던 방법의 최대 개수
export const TIP_LIMIT = 5;

// 답변에 쓸 공부법 topic. 질문이고 과목이 있으면 그 과목이 먼저다
export function knowledgeTopics(
  intent: Intent,
  subject: Subject | null,
  knowledge: Knowledge[],
): MethodTopic[] {
  if (intent === "question" && subject) return [subject, ...knowledge];
  return [...knowledge];
}

export function loadsTips(intent: Intent): boolean {
  return intent === "question";
}

function sectionLines(section: KnowledgeSection): string[] {
  const lines = [section.heading];
  if (section.kind === "pairs") {
    for (const item of section.items) {
      lines.push(`- ${stripMarks(item.label)}: ${stripMarks(item.text)}`);
    }
  } else {
    for (const item of section.items) lines.push(`- ${stripMarks(item)}`);
  }
  return lines;
}

// 공부법 섹션과 잘 맞았던 방법을 프롬프트 글로 만든다. 둘 다 비면 ""
export function formatKnowledge(
  sections: KnowledgeSection[],
  tips: string[],
): string {
  const blocks: string[] = [];
  let currentTopic: MethodTopic | null = null;
  let lines: string[] = [];
  const flush = () => {
    if (lines.length > 0) blocks.push(lines.join("\n"));
    lines = [];
  };
  for (const section of sections) {
    if (section.topic !== currentTopic) {
      flush();
      currentTopic = section.topic;
      const label = METHOD_TOPIC_LABELS[section.topic];
      lines.push(
        section.topic === "mental" || section.topic === "time"
          ? `[${label}]`
          : `[${label} 공부법]`,
      );
    }
    lines.push(...sectionLines(section));
  }
  flush();
  if (tips.length > 0) {
    blocks.push(
      ["[이 수험생에게 잘 맞았던 방법]", ...tips.map((t) => `- ${t}`)].join(
        "\n",
      ),
    );
  }
  return blocks.join("\n\n");
}
