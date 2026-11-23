// 공부법 문서(docs/study-methods/*.md)를 읽어 study_methods 내용 마이그레이션 SQL로 바꾼다.
// OpenAI·Supabase를 import하지 않는 순수 모듈이다.
import { SUBJECT_LABELS } from "./subjects.ts";

export const METHOD_TOPICS = [
  "korean",
  "english",
  "public_health",
  "health_admin",
  "mental",
  "time",
] as const;

export type MethodTopic = (typeof METHOD_TOPICS)[number];

export const METHOD_TOPIC_LABELS: Record<MethodTopic, string> = {
  ...SUBJECT_LABELS,
  mental: "멘탈관리",
  time: "시간관리",
};

export const METHOD_FILES: Record<MethodTopic, string> = {
  korean: "korean.md",
  english: "english.md",
  public_health: "public-health.md",
  health_admin: "health-admin.md",
  mental: "mental.md",
  time: "time.md",
};

export interface MethodPair {
  label: string;
  text: string;
}

export type MethodSection =
  | { heading: string; kind: "list"; items: string[] }
  | { heading: string; kind: "pairs"; items: MethodPair[] };

export interface MethodDoc {
  topic: MethodTopic;
  sections: MethodSection[];
}

// 파일 하나에 쓸 수 있는 형광펜(==…==) 수
export const MAX_HIGHLIGHTS = 3;

// study_methods.heading 길이 제한(DB check)
const MAX_HEADING_LENGTH = 100;

export class MethodDocError extends Error {
  constructor(file: string, line: number, reason: string) {
    super(`${file}:${line} ${reason}`);
    this.name = "MethodDocError";
  }
}

// 앱에 보여 줄 때 쓰는 꾸밈(**, ==) 제거
export function stripMarks(text: string): string {
  return text.replaceAll("**", "").replaceAll("==", "");
}

function countOf(text: string, mark: string): number {
  return text.split(mark).length - 1;
}

interface OpenSection {
  heading: string;
  line: number;
  kind: "list" | "pairs" | null;
}

const SEPARATOR_ROW = /^\|?\s*:?-+:?\s*\|\s*:?-+:?\s*\|?$/;

function splitRow(line: string): string[] {
  let body = line.trim();
  if (body.startsWith("|")) body = body.slice(1);
  if (body.endsWith("|")) body = body.slice(0, -1);
  return body.split("|").map((cell) => cell.trim());
}

// 형식이 틀리면 MethodDocError(파일:줄 이유)를 던진다
export function parseMethodDoc(
  topic: MethodTopic,
  file: string,
  markdown: string,
): MethodDoc {
  function fail(line: number, reason: string): never {
    throw new MethodDocError(file, line, reason);
  }
  const lines = markdown.split(/\r?\n/);

  const sections: MethodSection[] = [];
  let titleSeen = false;
  let highlights = 0;
  // 열려 있는 섹션과 표 상태
  let current = null as OpenSection | null;
  let items: (string | MethodPair)[] = [];
  let tableRows = 0; // 표에서 지금까지 읽은 줄 수(머리글, 구분선 포함)
  let tableClosed = false;

  const checkMarks = (text: string, line: number) => {
    if (countOf(text, "**") % 2 !== 0) fail(line, "**가 짝이 맞지 않아요");
    const marks = countOf(text, "==");
    if (marks % 2 !== 0) fail(line, "==가 짝이 맞지 않아요");
    highlights += marks / 2;
    if (highlights > MAX_HIGHLIGHTS) {
      fail(line, `형광펜은 파일당 ${MAX_HIGHLIGHTS}곳까지예요`);
    }
  };

  const closeSection = () => {
    if (!current) return;
    if (current.kind === null || items.length === 0) {
      fail(current.line, "섹션에 항목이 없어요");
    }
    if (current.kind === "list") {
      sections.push({
        heading: current.heading,
        kind: "list",
        items: items as string[],
      });
    } else {
      sections.push({
        heading: current.heading,
        kind: "pairs",
        items: items as MethodPair[],
      });
    }
    current = null;
    items = [];
    tableRows = 0;
    tableClosed = false;
  };

  for (let index = 0; index < lines.length; index++) {
    const no = index + 1;
    const raw = lines[index];
    if (raw.trim() === "") {
      if (tableRows > 0) tableClosed = true;
      continue;
    }

    if (!titleSeen) {
      if (!raw.startsWith("# ") || raw.slice(2).trim() === "") {
        fail(no, "첫 줄은 `# 제목`이어야 해요");
      }
      titleSeen = true;
      continue;
    }

    if (raw.startsWith("# ")) fail(no, "제목(`# `)은 한 번만 쓸 수 있어요");

    if (raw.startsWith("## ")) {
      closeSection();
      const heading = raw.slice(3).trim();
      if (heading === "" || heading.length > MAX_HEADING_LENGTH) {
        fail(no, `소제목은 1~${MAX_HEADING_LENGTH}자여야 해요`);
      }
      current = { heading, line: no, kind: null };
      continue;
    }

    if (!current) fail(no, "소제목(`## `) 앞에는 내용을 둘 수 없어요");
    const section: OpenSection = current;

    if (raw.startsWith("- ")) {
      if (section.kind === "pairs") {
        fail(no, "한 섹션에 목록과 표를 섞을 수 없어요");
      }
      section.kind = "list";
      const text = raw.slice(2).trim();
      if (text === "") fail(no, "빈 항목이에요");
      checkMarks(text, no);
      items.push(text);
      continue;
    }

    if (raw.startsWith("|")) {
      if (section.kind === "list") {
        fail(no, "한 섹션에 목록과 표를 섞을 수 없어요");
      }
      if (tableClosed) fail(no, "섹션에는 표를 하나만 둘 수 있어요");
      section.kind = "pairs";
      const cells = splitRow(raw);
      if (cells.length !== 2) fail(no, "표는 칸이 2개여야 해요");
      tableRows++;
      if (tableRows === 1) continue; // 머리글
      if (tableRows === 2) {
        if (!SEPARATOR_ROW.test(raw.trim())) {
          fail(no, "머리글 다음 줄은 `|---|---|`여야 해요");
        }
        continue;
      }
      const [label, text] = cells;
      if (label === "" || text === "") fail(no, "표에 빈 칸이 있어요");
      checkMarks(label, no);
      checkMarks(text, no);
      items.push({ label, text });
      continue;
    }

    fail(no, "목록(`- `)이나 표(`|`)만 쓸 수 있어요");
  }

  if (!titleSeen) fail(1, "첫 줄은 `# 제목`이어야 해요");
  closeSection();
  if (sections.length === 0) fail(1, "소제목(`## `) 섹션이 하나도 없어요");

  return { topic, sections };
}

// SQL 문자열 리터럴(작은따옴표 두 번). 백슬래시는 standard_conforming_strings 기본값에서 그대로다.
function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

// 6개 topic을 모두 한 번씩 받아 study_methods 내용을 통째로 바꾸는 SQL을 만든다
export function methodsMigrationSql(docs: MethodDoc[]): string {
  const byTopic = new Map<MethodTopic, MethodDoc>();
  for (const doc of docs) {
    if (byTopic.has(doc.topic)) {
      throw new Error(`topic이 겹쳐요: ${doc.topic}`);
    }
    byTopic.set(doc.topic, doc);
  }
  const missing = METHOD_TOPICS.filter((topic) => !byTopic.has(topic));
  if (missing.length > 0 || docs.length !== METHOD_TOPICS.length) {
    throw new Error(`topic이 모두 있어야 해요. 없는 것: ${missing.join(", ")}`);
  }

  const rows: string[] = [];
  for (const topic of METHOD_TOPICS) {
    // 위에서 6개가 모두 있음을 확인했다
    byTopic.get(topic)!.sections.forEach((section, i) => {
      rows.push(
        `(${sqlString(topic)}, ${i + 1}, ${sqlString(section.heading)}, ${
          sqlString(section.kind)
        }, ${sqlString(JSON.stringify(section.items))}::jsonb)`,
      );
    });
  }

  return [
    "-- 자동 생성: npm run methods:migration (docs/study-methods). 직접 고치지 않는다.",
    "-- 공부법 내용을 통째로 바꾼다.",
    "delete from public.study_methods;",
    "insert into public.study_methods (topic, position, heading, kind, items) values",
    rows.join(",\n") + ";",
    "",
  ].join("\n");
}
