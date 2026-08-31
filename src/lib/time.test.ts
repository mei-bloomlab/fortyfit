import assert from "node:assert/strict";
import test from "node:test";
import {
  formatTime,
  parseStudioDateTime,
  startOfStudioDay,
  toLocalInputValue,
} from "./time";

test("datetime-local 15:00 WITA saves as 07:00Z and displays 15:00", () => {
  const saved = parseStudioDateTime("2026-08-31T15:00");
  assert.equal(saved.toISOString(), "2026-08-31T07:00:00.000Z");
  assert.equal(formatTime(saved), "15:00");
  assert.equal(formatTime("2026-08-31T15:00"), "15:00");
});

test("15:00Z displays as 23:00 WITA", () => {
  assert.equal(formatTime(new Date("2026-08-31T15:00:00.000Z")), "23:00");
  assert.equal(formatTime("2026-08-31T15:00:00.000Z"), "23:00");
});

test("picker round-trips 15:00 WITA", () => {
  const saved = parseStudioDateTime("2026-08-31T15:00");
  assert.equal(toLocalInputValue(saved), "2026-08-31T15:00");
  assert.equal(toLocalInputValue(new Date("2026-08-31T07:00:00.000Z")), "2026-08-31T15:00");
});

test("picker also round-trips 09:30 WITA", () => {
  const saved = parseStudioDateTime("2026-08-31T09:30");
  assert.equal(saved.toISOString(), "2026-08-31T01:30:00.000Z");
  assert.equal(formatTime(saved), "09:30");
  assert.equal(toLocalInputValue(saved), "2026-08-31T09:30");
});

test("ISO instants keep their offset and are not treated as datetime-local", () => {
  const instant = parseStudioDateTime("2026-08-31T15:00:00.000Z");
  assert.equal(instant.toISOString(), "2026-08-31T15:00:00.000Z");
  assert.equal(formatTime(instant), "23:00");
});

test("startOfStudioDay uses Asia/Makassar midnight", () => {
  // 15:00Z = 23:00 WITA on 31 Aug → start of 31 Aug WITA is 16:00Z on 30 Aug
  assert.equal(
    startOfStudioDay(new Date("2026-08-31T15:00:00.000Z")).toISOString(),
    "2026-08-30T16:00:00.000Z",
  );
  // 16:00Z = 00:00 WITA on 1 Sep
  assert.equal(
    startOfStudioDay(new Date("2026-08-31T16:00:00.000Z")).toISOString(),
    "2026-08-31T16:00:00.000Z",
  );
});
