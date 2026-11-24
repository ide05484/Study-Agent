import { assertEquals } from "jsr:@std/assert";
import { chatResult } from "./response.ts";

Deno.test("chatResult는 넘기지 않은 플래그를 false로 채운다", () => {
  assertEquals(chatResult(["u", "a"]), {
    messages: ["u", "a"],
    logged: false,
    planChanged: false,
    replanFailed: false,
    superseded: false,
  });
});

Deno.test("chatResult는 넘긴 플래그만 바꾸고 키 순서를 지킨다", () => {
  const result = chatResult(["u"], { superseded: true, planChanged: true });
  assertEquals(result, {
    messages: ["u"],
    logged: false,
    planChanged: true,
    replanFailed: false,
    superseded: true,
  });
  assertEquals(Object.keys(result), [
    "messages",
    "logged",
    "planChanged",
    "replanFailed",
    "superseded",
  ]);
});
