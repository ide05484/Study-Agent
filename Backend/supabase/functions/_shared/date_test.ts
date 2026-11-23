import { assertEquals } from "jsr:@std/assert";
import { dayLabel, dayStartUtc, studyTimeDate, toDateKey } from "./date.ts";

Deno.test("하루 시작 시각은 그 시간대 자정", () => {
  assertEquals(
    dayStartUtc("2026-11-14", "Asia/Seoul"),
    "2026-11-13T15:00:00.000Z",
  );
  assertEquals(dayStartUtc("2026-11-14", "UTC"), "2026-11-14T00:00:00.000Z");
});

Deno.test("한국 0~9시는 UTC 전날이어도 한국 날짜", () =>
  assertEquals(
    toDateKey(new Date("2026-10-26T15:30:00Z"), "Asia/Seoul"),
    "2026-10-27",
  ));
Deno.test("새벽 1시의 오늘 순공은 전날", () =>
  assertEquals(
    studyTimeDate(new Date("2026-11-13T16:00:00Z"), "Asia/Seoul", "today"),
    "2026-11-13",
  ));
Deno.test("새벽 4시 정각부터는 그날", () =>
  assertEquals(
    studyTimeDate(new Date("2026-11-13T19:00:00Z"), "Asia/Seoul", "today"),
    "2026-11-14",
  ));
Deno.test("어제는 하루 전", () =>
  assertEquals(
    studyTimeDate(new Date("2026-11-14T03:00:00Z"), "Asia/Seoul", "yesterday"),
    "2026-11-13",
  ));

Deno.test("날짜 표기: 오늘이면 오늘, 아니면 월 일", () => {
  assertEquals(dayLabel("2026-11-23", "2026-11-23"), "오늘");
  assertEquals(dayLabel("2026-11-13", "2026-11-23"), "11월 13일");
});
