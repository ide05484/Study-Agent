// chat에서 OpenAI를 부르는 유일한 파일. 메시지 분석 1번 + 답변 1번까지, 다시 시도하지 않는다.
import { MODEL, openai } from "../_shared/openai.ts";
import { SUBJECT_LABELS } from "../_shared/subjects.ts";
import { progressLabel } from "../_shared/units.ts";
import {
  type Analysis,
  ANALYSIS_SCHEMA,
  type BookRef,
  type Intent,
  parseAnalysis,
} from "./analysis.ts";
import {
  type CoachContext,
  formatCoachContext,
  type HistoryMessage,
} from "./context.ts";
import { replyInstructions } from "./reply.ts";

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

function bookLine(book: BookRef): string {
  return `- ${book.id} | ${SUBJECT_LABELS[book.subject]} | ${book.title} | ${
    progressLabel(book)
  }`;
}

function analysisInstructions(books: BookRef[], today: string): string {
  const bookList = books.length > 0
    ? books.map(bookLine).join("\n")
    : "등록된 교재 없음";
  return `너는 보건직 공무원 수험생이 보낸 채팅 메시지 하나를 분석해 정해진 JSON으로만 답한다.
오늘 날짜: ${today}

intent (하나만 고른다)
- study_log: 공부한 분량이나 푼 문제를 보고한다
- study_time: 순공시간만 알려 준다
- schedule: 분량이나 일정을 바꾸고 싶어 한다(바빠서 줄이기, 시험일 변경 등)
- book_add: 새 교재를 추가하려 한다
- usage: 이 앱(채팅)을 어떻게 쓰는지 묻는다
- question: 공부법, 성적, 고민 질문과 그 밖의 모든 메시지

subject: 메시지가 주로 다루는 과목. 없으면 null.
과목 값: korean(국어), english(영어), public_health(공중보건), health_admin(보건행정)

entries: 공부한 분량 보고마다 하나. 보고가 없으면 빈 배열.
- book_id: 아래 교재 목록의 id 중 하나. 어느 교재인지 알 수 없으면 null.
  같은 과목 교재가 여러 권인데 메시지에 교재명이 없으면 null.
- "15~17강" → start_unit 15, end_unit 17. "Day 12까지", "12강까지" → start_unit null, end_unit 12. "3챕터" → start_unit 3, end_unit 3.
- 페이지처럼 교재 단위와 맞지 않는 숫자는 start_unit·end_unit에 넣지 않는다.
- round: 몇 회독인지 메시지에서 말했을 때만 숫자, 아니면 null.
- questions_solved, questions_wrong: "기출 20문제 중 5개 틀림" → 20, 5. 말하지 않았으면 null.

study_time: 순공시간(실제로 집중해 공부한 시간)을 말했을 때만 채운다. 없으면 null.
- minutes는 분 단위 정수. "3시간 20분" → 200.
- "더", "추가로"처럼 이미 적은 시간에 더하는 말이면 add true, 아니면 false.
- 어제 순공시간이면 day "yesterday", 아니면 "today".

교재 목록 (id | 과목 | 제목 | 지금 진도)
${bookList}`;
}

export async function analyzeMessage(
  content: string,
  books: BookRef[],
  today: string,
): Promise<Analysis> {
  const response = await openai.responses.create({
    model: MODEL,
    reasoning: { effort: "low" },
    max_output_tokens: ANALYZE_MAX_OUTPUT_TOKENS,
    instructions: analysisInstructions(books, today),
    input: content,
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
  savedStudyTime: string | null;
}): Promise<string> {
  const instructions = `${
    replyInstructions(params.intent, params.savedStudyTime)
  }

아래는 이 수험생의 공부 현황이다. 여기 있는 수치와 사실만 말한다.
${formatCoachContext(params.ctx)}`;

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
