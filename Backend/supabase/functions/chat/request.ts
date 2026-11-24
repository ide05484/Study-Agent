// 채팅 요청 본문 검증. OpenAI·Supabase를 import하지 않는다.
import { isRecord } from "./bookDraft.ts";

export type ChatRequest =
  | { content: string }
  | { choice: { message_id: string; answer: "yes" | "no" } };

// 글(content)·칩(choice) 중 하나만 있어야 한다. 하루 첫 메시지는 화면이 DB 함수로 바로 저장한다
export function parseChatRequest(
  body: unknown,
  maxLength: number,
): ChatRequest | null {
  if (!isRecord(body)) return null;
  const hasContent = body.content !== undefined;
  const hasChoice = body.choice !== undefined;
  if (hasContent === hasChoice) return null;

  if (hasContent) {
    if (typeof body.content !== "string") return null;
    const content = body.content.trim();
    return content.length >= 1 && content.length <= maxLength
      ? { content }
      : null;
  }

  const c = body.choice;
  if (!isRecord(c)) return null;
  if (typeof c.message_id !== "string" || c.message_id === "") return null;
  if (c.answer !== "yes" && c.answer !== "no") return null;
  return { choice: { message_id: c.message_id, answer: c.answer } };
}
