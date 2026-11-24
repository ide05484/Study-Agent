import { assertEquals } from "jsr:@std/assert";
import { parseChatRequest } from "./request.ts";

Deno.test("parseChatRequest", () => {
  assertEquals(parseChatRequest({ content: " 안녕 " }, 1000), {
    content: "안녕",
  });
  const choice = { choice: { message_id: "m1", answer: "yes" } } as const;
  assertEquals(parseChatRequest(choice, 1000), choice);
  assertEquals(
    parseChatRequest({ content: "a", choice: choice.choice }, 1000),
    null,
  );
  assertEquals(
    parseChatRequest({ choice: { message_id: "", answer: "yes" } }, 1000),
    null,
  );
  assertEquals(
    parseChatRequest({ choice: { message_id: "m1", answer: "maybe" } }, 1000),
    null,
  );
  assertEquals(parseChatRequest({ content: "a".repeat(1001) }, 1000), null);
  assertEquals(parseChatRequest({}, 1000), null);
});

Deno.test("parseChatRequest: 열기 요청은 더 받지 않는다", () => {
  assertEquals(parseChatRequest({ open: true }, 1000), null);
});
