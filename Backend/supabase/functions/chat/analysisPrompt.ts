import { SUBJECT_LABELS } from "../_shared/subjects.ts";
import { type BookUnit, progressLabel } from "../_shared/units.ts";
import type { BookRef } from "./analysis.ts";
import {
  type BookDraft,
  type MissingField,
  missingFields,
} from "./bookDraft.ts";

// 메시지 분석 지침과 입력 묶음. OpenAI·Supabase를 import하지 않는 순수 모듈이다.

// 직전에 코치가 물은 것. 없으면 null
export type AskedAbout = "study_time" | "time_available" | null;

const MAX_BUNDLE_MESSAGES = 10;
const MAX_BUNDLE_LENGTH = 4000;

// 한 메시지면 그대로, 둘 이상이면 번호를 붙인다. 최근 10개까지, 합이 4000자를 넘지 않게 뒤에서부터 채운다
export function bundleInput(contents: string[]): string {
  if (contents.length <= 1) {
    return (contents[0] ?? "").slice(0, MAX_BUNDLE_LENGTH);
  }
  const recent = contents.slice(-MAX_BUNDLE_MESSAGES);
  for (let start = 0; start < recent.length; start++) {
    const text = recent.slice(start).map((c, i) => `${i + 1}. ${c}`).join("\n");
    if (text.length <= MAX_BUNDLE_LENGTH) return text;
  }
  return `1. ${recent[recent.length - 1]}`.slice(0, MAX_BUNDLE_LENGTH);
}

const BUNDLED_BLOCK = `

입력 형식: 메시지가 번호순으로 여럿이다. 뒤 메시지가 앞 메시지를 고치거나 덧붙인다. 예를 들어 "1. 국어 2챕터 2. 아, 3개"는 국어 3챕터 하나만 보고한 것이다. 고친 값만 남기고, 같은 분량을 두 번 세지 않는다.`;

function askedBlock(asked: AskedAbout): string {
  if (asked === "study_time") {
    return `

직전에 코치가 오늘 순공시간을 물었다. 시간만 와도 순공시간이다. 시간을 말했으면 intent는 study_time이고 study_time을 채운다. 시간이 없는 답(예: "몰라")이면 평소처럼 고른다.`;
  }
  if (asked === "time_available") {
    return `

직전에 코치가 오늘 공부할 수 있는 시간을 물었다. 앞으로 할 수 있는 시간("6시간 정도 할 수 있어")은 순공시간이 아니라서 study_time이 아니다. 이미 공부한 시간을 분명히 말했을 때만 study_time을 채운다.`;
  }
  return "";
}

function bookLine(book: BookRef): string {
  return `- ${book.id} | ${SUBJECT_LABELS[book.subject]} | ${book.title} | ${
    progressLabel(book)
  }`;
}

const UNIT_NAMES: Record<BookUnit, string> = {
  day: "Day",
  chapter: "챕터",
  session: "회차",
};

const MISSING_NAMES: Record<MissingField, string> = {
  subject: "과목",
  title: "제목",
  amount: "단위와 총량",
};

function pendingBlock(pending: BookDraft): string {
  const missing = missingFields(pending).map((m) => MISSING_NAMES[m]);
  const subject = pending.subject ? SUBJECT_LABELS[pending.subject] : "없음";
  const unit = pending.unit ? UNIT_NAMES[pending.unit] : "없음";
  return `

받아 두는 교재(아직 저장 전): 과목 ${subject} | 제목 ${
    pending.title ?? "없음"
  } | 단위 ${unit} | 총량 ${
    pending.total_units ?? "없음"
  } | ${pending.target_rounds}회독
빠진 항목: ${missing.length > 0 ? missing.join(", ") : "없음"}
이 메시지가 받아 두는 교재를 채우거나 고치는 말이면 intent는 book_add이고, 바꾸는 항목만 book에 넣는다. 교재와 상관없는 말이면 원래 intent를 고르고 book은 null이다.`;
}

export function analysisInstructions(
  books: BookRef[],
  today: string,
  pending: BookDraft | null,
  asked: AskedAbout,
  bundled: boolean,
): string {
  const bookList = books.length > 0
    ? books.map(bookLine).join("\n")
    : "등록된 교재 없음";
  return `너는 보건직 공무원 수험생이 보낸 채팅 메시지 하나를 분석해 정해진 JSON으로만 답한다.
오늘 날짜: ${today}

intent (하나만 고른다)
- study_log: 공부한 분량이나 푼 문제를 보고한다
- study_time: 순공시간만 알려 준다
- schedule: 분량이나 일정을 바꾸고 싶어 한다(바빠서 줄이기, 시험일 변경 등)
- book_add: 새 교재를 추가하려 하거나, 받아 두는 교재에 답한다
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

study_tip: 수험생이 자기에게 잘 맞았던 공부 방식을 말했을 때만 채운다. 없으면 null.
- content는 그 방식을 한 문장(200자 이내)으로 다듬는다. 예: "기출 풀고 바로 백지에 써 보니까 잘 외워졌어" → "기출을 풀고 바로 백지 복기하기"
- "오늘 공부 잘 됐다"처럼 방식이 없는 말, 분량 보고만 있는 말, 안 맞았던 방식은 null.
- subject는 그 방식이 해당하는 과목, 과목과 상관없으면 null.

knowledge: 답변에 필요한 참고 지식. 해당하는 것만, 없으면 빈 배열.
- mental: 점수 하락, 지침, 불안, 슬럼프, 비교, 시험 직전 긴장
- time: 시간 배분, 하루·주간 루틴, 휴식, 직장 병행, 시험 당일 시간 운영

book: 새 교재를 추가하려는 말이거나 아래 "받아 두는 교재"에 답하는 말일 때만 채운다. 아니면 null.
- 말한 항목만 채우고 나머지는 null. 목표 회독은 "3회독"처럼 말했을 때만.
- title은 20자 안으로 줄인다. 연도·출판사·강사 이름은 뺀다. 예: "2027 해커스 보건행정 기본서" → "보건행정 기본서"
- unit: Day(단어장 등) → day, 챕터·단원 → chapter, 회차·강·회분(인강, 모의고사) → session. 기본서와 인강 세트는 인강 회차로 센다.
- 새로 추가하는 교재의 총량이나 회차 수는 entries에 넣지 않는다. entries는 실제로 공부한 분량만이다.
- total_units는 그 단위의 전체 개수. 쪽 수는 쓰지 않는다. "모의고사 몇 개"처럼 모호하면 null.

wrap_up: 수험생이 오늘 공부를 마치려는 말일 때만 true. 예: "오늘 분량 다 끝냈어", "오늘은 여기까지", "이제 잘게". 질문, 일반 대화, 분량 보고만 있는 말은 false.

교재 목록 (id | 과목 | 제목 | 지금 진도)
${bookList}${pending ? pendingBlock(pending) : ""}${
    bundled ? BUNDLED_BLOCK : ""
  }${askedBlock(asked)}`;
}
