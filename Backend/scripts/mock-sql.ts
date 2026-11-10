// Mock 공부 데이터를 한 사용자에게 넣는 SQL을 표준 출력으로 낸다. 개발 프로젝트에서만 실행한다.
// 그 사용자의 계획(daily_tasks)·교재(books)·시험 기록(mock_exams, 점수는 cascade)을 지우고 다시 넣는다.
// 채팅(chat_messages)과 학습 기록(study_logs)은 건드리지 않는다.
//
// 사용: npm run mock:sql -- <USER_ID> [JSON 경로] > study-mock.sql
import { randomUUID } from "node:crypto";
import { loadMock, resolveMockPath } from "./mock/load.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const [userId, jsonPath] = process.argv.slice(2);
if (!userId || !UUID.test(userId)) {
  console.error("사용: npm run mock:sql -- <USER_ID> [JSON 경로]");
  process.exit(1);
}

const mock = loadMock(resolveMockPath(jsonPath));

const text = (value: string) => `'${value.replaceAll("'", "''")}'`;
const uid = text(userId);

const bookRows = mock.books.map((b) =>
  `  (${uid}, ${text(b.subject)}, ${text(b.title)}, ${text(b.unit)}, ${b.total_pages}, ` +
  `${b.current_round}, ${b.current_page}, ${b.target_rounds}, ${b.daily_amount ?? "null"})`
);

const exams = mock.exams.map((e) => ({ ...e, id: randomUUID() }));
const examRows = exams.map((e) =>
  `  (${text(e.id)}, ${uid}, ${text(e.kind)}, ${text(e.name)}, ${text(e.taken_on)})`
);
const scoreRows = exams.flatMap((e) =>
  Object.entries(e.scores).map(([subject, score]) =>
    `  (${text(e.id)}, ${uid}, ${text(subject)}, ${score})`
  )
);

const statements = [
  "begin;",
  `delete from public.daily_tasks where user_id = ${uid};`,
  `delete from public.books where user_id = ${uid};`,
  `delete from public.mock_exams where user_id = ${uid};`,
  "insert into public.books (user_id, subject, title, unit, total_pages, current_round, current_page, target_rounds, daily_amount) values",
  bookRows.join(",\n") + ";",
];
if (examRows.length > 0) {
  statements.push(
    "insert into public.mock_exams (id, user_id, kind, name, taken_on) values",
    examRows.join(",\n") + ";",
  );
}
if (scoreRows.length > 0) {
  statements.push(
    "insert into public.mock_exam_scores (mock_exam_id, user_id, subject, score) values",
    scoreRows.join(",\n") + ";",
  );
}
statements.push(
  `update public.profiles set exam_date = ${text(mock.exam_date)}, updated_at = now() where id = ${uid};`,
  "commit;",
);

console.log(statements.join("\n"));
