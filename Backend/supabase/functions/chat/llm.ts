// chat에서 OpenAI를 부르는 유일한 파일. 메시지 분석 1번 + 답변 1번까지, 다시 시도하지 않는다.
import { MODEL, openai } from "../_shared/openai.ts";
import {
  type Analysis,
  ANALYSIS_SCHEMA,
  type BookRef,
  type Intent,
  parseAnalysis,
} from "./analysis.ts";
import type { BookDraft } from "./bookDraft.ts";
import {
  analysisInstructions,
  type AskedAbout,
  bundleInput,
} from "./analysisPrompt.ts";
import {
  type CoachContext,
  formatCoachContext,
  type HistoryMessage,
} from "./context.ts";
import { replyInstructions, type ReplyOptions } from "./reply.ts";

const ANALYZE_MAX_OUTPUT_TOKENS = 1500;
const REPLY_MAX_OUTPUT_TOKENS = 2000;
// SDK 기본 재시도(2번)를 끈다. 실패하면 analysis_failed나 대체 답변으로 끝낸다.
// timeout(ms)은 함수가 끝나기 전에 대체 답변을 저장할 시간을 남기려고 둔다
const ANALYZE_REQUEST_OPTIONS = { maxRetries: 0, timeout: 20_000 };
const REPLY_REQUEST_OPTIONS = { maxRetries: 0, timeout: 30_000 };

interface LlmResponse {
  status?: string;
  output_text: string;
  usage?: unknown;
}

// 토큰 사용량을 남기고, 끝까지 만들지 못한 응답(incomplete 등)은 실패로 본다
function checkResponse(call: "analyze" | "reply", response: LlmResponse) {
  console.log(JSON.stringify({ call, usage: response.usage ?? null }));
  if (response.status !== "completed") {
    throw new Error(`${call}_${response.status ?? "unknown"}`);
  }
}

export async function analyzeMessage(
  contents: string[],
  books: BookRef[],
  today: string,
  pending: BookDraft | null,
  asked: AskedAbout,
): Promise<Analysis> {
  const response = await openai.responses.create({
    model: MODEL,
    reasoning: { effort: "low" },
    max_output_tokens: ANALYZE_MAX_OUTPUT_TOKENS,
    instructions: analysisInstructions(
      books,
      today,
      pending,
      asked,
      contents.length > 1,
    ),
    input: bundleInput(contents),
    text: {
      format: {
        type: "json_schema",
        name: "chat_analysis",
        strict: true,
        schema: ANALYSIS_SCHEMA,
      },
    },
  }, ANALYZE_REQUEST_OPTIONS);
  checkResponse("analyze", response);
  return parseAnalysis(JSON.parse(response.output_text), books);
}

export async function generateReply(params: {
  content: string;
  intent: Intent;
  ctx: CoachContext;
  history: HistoryMessage[];
  // formatKnowledge 결과. 없으면 ""
  knowledge: string;
  options: ReplyOptions;
}): Promise<string> {
  const knowledgeBlock = params.knowledge
    ? `\n\n아래는 참고할 공부법이다.\n${params.knowledge}`
    : "";
  const instructions = `${replyInstructions(params.intent, params.options)}

아래는 이 수험생의 공부 현황이다. 여기 있는 수치와 사실만 말한다.
${formatCoachContext(params.ctx)}${knowledgeBlock}`;

  const response = await openai.responses.create({
    model: MODEL,
    reasoning: { effort: "low" },
    max_output_tokens: REPLY_MAX_OUTPUT_TOKENS,
    instructions,
    input: [
      ...params.history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: params.content },
    ],
  }, REPLY_REQUEST_OPTIONS);
  checkResponse("reply", response);
  const reply = response.output_text.trim();
  if (!reply) throw new Error("reply_empty");
  return reply;
}
