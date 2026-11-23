// docs/study-methods 문서를 읽어 study_methods 내용 마이그레이션 SQL 파일을 만든다.
// 형식이 틀리면 오류 메시지만 내고 파일은 쓰지 않는다.
//
// 사용: npm run methods:migration
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  METHOD_FILES,
  METHOD_TOPICS,
  type MethodDoc,
  MethodDocError,
  methodsMigrationSql,
  parseMethodDoc,
} from "../supabase/functions/_shared/methods.ts";

const backendDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = join(backendDir, "..", "docs", "study-methods");
const migrationsDir = join(backendDir, "supabase", "migrations");

// UTC YYYYMMDDHHmmss
function migrationTimestamp(now: Date): string {
  return now.toISOString().replace(/\D/g, "").slice(0, 14);
}

try {
  const docs: MethodDoc[] = METHOD_TOPICS.map((topic) => {
    const file = METHOD_FILES[topic];
    const path = join(docsDir, file);
    if (!existsSync(path)) {
      throw new MethodDocError(file, 0, "파일이 없어요");
    }
    return parseMethodDoc(topic, file, readFileSync(path, "utf8"));
  });
  const sql = methodsMigrationSql(docs);

  mkdirSync(migrationsDir, { recursive: true });
  const out = join(migrationsDir, `${migrationTimestamp(new Date())}_study_methods_content.sql`);
  writeFileSync(out, sql, "utf8");
  console.log(relative(process.cwd(), out));
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
}
