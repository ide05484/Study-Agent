import { assertEquals } from "jsr:@std/assert";
import {
  formatMinutes,
  progressLabel,
  rangeLabel,
  taskRangeLabel,
} from "./units.ts";

Deno.test("범위 표기", () =>
  assertEquals(
    [
      rangeLabel("day", 3, 4),
      rangeLabel("chapter", 3, 3),
      rangeLabel("session", 12, 14),
    ],
    ["Day 3–4", "3챕터", "12–14회"],
  ));
Deno.test("진도 표기", () =>
  assertEquals(
    [
      progressLabel({
        unit: "day",
        total_units: 60,
        current_unit: 12,
        current_round: 1,
        target_rounds: 1,
      }),
      progressLabel({
        unit: "session",
        total_units: 60,
        current_unit: 21,
        current_round: 1,
        target_rounds: 3,
      }),
    ],
    ["Day 12/60", "1/3회독 21/60회"],
  ));
Deno.test("분량 표기는 2회독 이상이면 회독을 붙인다", () =>
  assertEquals(
    [
      taskRangeLabel(1, 1, "day", 3, 4),
      taskRangeLabel(2, 2, "session", 12, 14),
    ],
    ["Day 3–4", "2회독 12–14회"],
  ));
Deno.test("분 표기", () =>
  assertEquals(
    [formatMinutes(200), formatMinutes(180), formatMinutes(40)],
    ["3시간 20분", "3시간", "40분"],
  ));
