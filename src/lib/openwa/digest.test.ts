import assert from "node:assert/strict";
import test from "node:test";
import {
  isDigestDue,
  normalizeDigestTime,
  parseClockTime,
  zonedClock,
} from "./digest";

const WITA = "Asia/Makassar";

test("default digest clock is 09:30", () => {
  assert.equal(normalizeDigestTime(""), "09:30");
  assert.equal(normalizeDigestTime("25:00"), "09:30");
  assert.equal(normalizeDigestTime("9:05"), "09:05");
  assert.deepEqual(parseClockTime("09:30"), { hour: 9, minute: 30 });
});

test("zoned clock uses Asia/Makassar wall time", () => {
  const clock = zonedClock(new Date("2026-08-30T01:30:00.000Z"), WITA);
  assert.equal(clock.date, "2026-08-30");
  assert.equal(clock.minutes, 9 * 60 + 30);
});

test("digest is not due before the configured WITA clock", () => {
  assert.equal(
    isDigestDue({
      now: new Date("2026-08-30T01:29:00.000Z"),
      timeZone: WITA,
      clockTime: "09:30",
    }),
    false,
  );
});

test("digest is due at 09:30 WITA and later the same morning", () => {
  assert.equal(
    isDigestDue({
      now: new Date("2026-08-30T01:30:00.000Z"),
      timeZone: WITA,
      clockTime: "09:30",
    }),
    true,
  );
  assert.equal(
    isDigestDue({
      now: new Date("2026-08-30T02:15:00.000Z"),
      timeZone: WITA,
      clockTime: "09:30",
    }),
    true,
  );
});

test("digest is sent at most once per local date even if laptop wakes late", () => {
  assert.equal(
    isDigestDue({
      now: new Date("2026-08-30T03:00:00.000Z"),
      timeZone: WITA,
      clockTime: "09:30",
      lastSentOn: "2026-08-30",
    }),
    false,
  );
  assert.equal(
    isDigestDue({
      now: new Date("2026-08-31T01:30:00.000Z"),
      timeZone: WITA,
      clockTime: "09:30",
      lastSentOn: "2026-08-30",
    }),
    true,
  );
});

test("digest clock time is overridable from settings", () => {
  assert.equal(
    isDigestDue({
      now: new Date("2026-08-30T01:30:00.000Z"),
      timeZone: WITA,
      clockTime: "10:00",
    }),
    false,
  );
  assert.equal(
    isDigestDue({
      now: new Date("2026-08-30T02:00:00.000Z"),
      timeZone: WITA,
      clockTime: "10:00",
    }),
    true,
  );
});
