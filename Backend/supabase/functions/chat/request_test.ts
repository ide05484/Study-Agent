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

Deno.test("parseChatRequest: open", () => {
  assertEquals(parseChatRequest({ open: true }, 1000), { open: true });
  assertEquals(parseChatRequest({ open: false }, 1000), null);
  assertEquals(parseChatRequest({ open: true, content: "a" }, 1000), null);
  assertEquals(
    parseChatRequest(
      { open: true, choice: { message_id: "m1", answer: "yes" } },
      1000,
    ),
    null,
  );
});
