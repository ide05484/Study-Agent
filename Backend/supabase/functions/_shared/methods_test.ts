import { assertEquals, assertThrows } from "jsr:@std/assert";
import {
  METHOD_FILES,
  METHOD_TOPICS,
  type MethodDoc,
  MethodDocError,
  methodsMigrationSql,
  type MethodTopic,
  parseMethodDoc,
  stripMarks,
} from "./methods.ts";

const FILE = "public-health.md";

const DOC = `# 공중보건

## 과목 특징
- 같은 주제가 되풀이돼요. ==반복 출제는 무실점==
- **역학은 매년** 나와요

## 고민별 처방
| 고민 | 처방 |
|---|---|
| 외울 게 많음 | 기출 표부터 |
`;

const parse = (md: string) => parseMethodDoc("public_health", FILE, md);

Deno.test("parseMethodDoc: 목록과 두 칸 표를 순서대로", () => {
  assertEquals(parseMethodDoc("public_health", "public-health.md", DOC), {
    topic: "public_health",
    sections: [
      {
        heading: "과목 특징",
        kind: "list",
        items: [
          "같은 주제가 되풀이돼요. ==반복 출제는 무실점==",
          "**역학은 매년** 나와요",
        ],
      },
      {
        heading: "고민별 처방",
        kind: "pairs",
        items: [{ label: "외울 게 많음", text: "기출 표부터" }],
      },
    ],
  });
});

Deno.test("parseMethodDoc: 문단 줄은 오류", () => {
  assertThrows(
    () => parse("# 제목\n\n## 과목 특징\n그냥 문장\n"),
    MethodDocError,
    `${FILE}:4 `,
  );
});

Deno.test("parseMethodDoc: 형광펜 4곳은 오류", () => {
  const md = "# 제목\n\n## 특징\n- ==a==\n- ==a==\n- ==a==\n- ==a==\n";
  assertThrows(() => parse(md), MethodDocError, `${FILE}:7 `);
  // 3곳까지는 통과
  parse("# 제목\n\n## 특징\n- ==a==\n- ==a==\n- ==a==\n");
});

Deno.test("parseMethodDoc: 짝 안 맞는 꾸밈은 오류", () => {
  assertThrows(
    () => parse("# 제목\n\n## 특징\n- ==반쯤\n"),
    MethodDocError,
    `${FILE}:4 `,
  );
  assertThrows(
    () => parse("# 제목\n\n## 특징\n- **반쯤\n"),
    MethodDocError,
    `${FILE}:4 `,
  );
});

Deno.test("parseMethodDoc: 목록과 표를 섞으면 오류", () => {
  assertThrows(
    () => parse("# 제목\n\n## 특징\n- a\n| 가 | 나 |\n|---|---|\n| 1 | 2 |\n"),
    MethodDocError,
    `${FILE}:5 `,
  );
  assertThrows(
    () => parse("# 제목\n\n## 특징\n| 가 | 나 |\n|---|---|\n| 1 | 2 |\n- a\n"),
    MethodDocError,
    `${FILE}:7 `,
  );
});

Deno.test("parseMethodDoc: 빈 섹션은 오류", () => {
  assertThrows(
    () => parse("# 제목\n\n## 특징\n\n## 다음\n- a\n"),
    MethodDocError,
    `${FILE}:3 `,
  );
  assertThrows(() => parse("# 제목\n"), MethodDocError, `${FILE}:1 `);
});

Deno.test("parseMethodDoc: # 제목 없으면 오류", () => {
  assertThrows(
    () => parse("## 특징\n- a\n"),
    MethodDocError,
    `${FILE}:1 `,
  );
  assertThrows(
    () => parse("# 제목\n# 또 제목\n## 특징\n- a\n"),
    MethodDocError,
    `${FILE}:2 `,
  );
});

Deno.test("parseMethodDoc: 칸 3개 표는 오류", () => {
  assertThrows(
    () => parse("# 제목\n\n## 특징\n| 가 | 나 | 다 |\n|---|---|---|\n"),
    MethodDocError,
    `${FILE}:4 `,
  );
  assertThrows(
    () => parse("# 제목\n\n## 특징\n| 가 | 나 |\n|---|---|\n| 1 | 2 | 3 |\n"),
    MethodDocError,
    `${FILE}:6 `,
  );
});

Deno.test("parseMethodDoc: 인용문·###·들여쓴 목록은 오류", () => {
  for (const line of ["> 인용", "### 소소제목", "  - 들여쓴 항목"]) {
    assertThrows(
      () => parse(`# 제목\n\n## 특징\n- a\n${line}\n`),
      MethodDocError,
      `${FILE}:5 `,
    );
  }
});

Deno.test("stripMarks: 꾸밈 표시를 걷어낸다", () => {
  assertEquals(stripMarks("**역학** ==무실점== 그대로"), "역학 무실점 그대로");
});

const sectionsOf = (
  heading: string,
  items: string[],
): MethodDoc["sections"] => [
  { heading, kind: "list", items },
];
const docFor = (topic: MethodTopic, items: string[] = ["a"]): MethodDoc => ({
  topic,
  sections: sectionsOf("과목 특징", items),
});
const allDocs = (): MethodDoc[] => METHOD_TOPICS.map((t) => docFor(t));

Deno.test("methodsMigrationSql: delete 뒤 insert, position은 1부터", () => {
  const docs = allDocs();
  docs[2] = {
    topic: "public_health",
    sections: [
      { heading: "과목 특징", kind: "list", items: ["a", "b"] },
      {
        heading: "고민별 처방",
        kind: "pairs",
        items: [{ label: "고민", text: "처방" }],
      },
    ],
  };
  const sql = methodsMigrationSql(docs);
  const lines = sql.split("\n");
  assertEquals(
    lines[0].startsWith("-- 자동 생성: npm run methods:migration"),
    true,
  );
  assertEquals(lines[1], "-- 공부법 내용을 통째로 바꾼다.");
  assertEquals(lines[2], "delete from public.study_methods;");
  assertEquals(
    sql.includes(
      `('public_health', 1, '과목 특징', 'list', '["a","b"]'::jsonb)`,
    ),
    true,
  );
  assertEquals(
    sql.includes(
      `('public_health', 2, '고민별 처방', 'pairs', '[{"label":"고민","text":"처방"}]'::jsonb)`,
    ),
    true,
  );
  assertEquals(sql.includes(`('mental', 1,`), true);
});

Deno.test("methodsMigrationSql: 작은따옴표·|·백슬래시 이스케이프", () => {
  const item = "수험생's | a\\b";
  const docs = allDocs();
  docs[0] = {
    topic: "korean",
    sections: sectionsOf("it's", [item]),
  };
  const sql = methodsMigrationSql(docs);
  assertEquals(sql.includes("'it''s'"), true);
  const match = sql.match(/\('korean', 1, 'it''s', 'list', '(.*)'::jsonb\)/);
  if (!match) throw new Error("korean 행을 찾지 못했어요");
  const json = match[1].replaceAll("''", "'");
  assertEquals(JSON.parse(json), [item]);
});

Deno.test("methodsMigrationSql: topic 6개가 모두 한 번씩 없으면 오류", () => {
  assertThrows(() => methodsMigrationSql(allDocs().slice(0, 5)), Error);
  assertThrows(
    () => methodsMigrationSql([...allDocs().slice(0, 5), docFor("korean")]),
    Error,
  );
});

Deno.test("METHOD_FILES: topic마다 파일이 있다", () => {
  assertEquals(METHOD_FILES.public_health, "public-health.md");
  assertEquals(METHOD_FILES.health_admin, "health-admin.md");
  assertEquals(METHOD_FILES.mental, "mental.md");
});

Deno.test("parseMethodDoc: UTF-8 BOM이 붙어도 같은 결과", () => {
  assertEquals(parse("﻿" + DOC), parse(DOC));
});

Deno.test("parseMethodDoc: 소제목에 꾸밈이 있으면 오류", () => {
  assertThrows(
    () => parse("# 제목\n\n## **특징**\n- a\n"),
    MethodDocError,
    `${FILE}:3 `,
  );
  assertThrows(
    () => parse("# 제목\n\n## ==특징==\n- a\n"),
    MethodDocError,
    `${FILE}:3 `,
  );
});
