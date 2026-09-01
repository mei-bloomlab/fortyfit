import assert from "node:assert/strict";
import test from "node:test";
import { rescheduleTarget } from "./scheduling";
import { formatDateTime, toLocalInputValue } from "./time";

test("moving a session keeps it scheduled at the new studio time", () => {
  const target = rescheduleTarget("scheduled", "2026-09-03T16:00");
  assert.ok(target);
  assert.equal(target.status, "scheduled");
  assert.equal(toLocalInputValue(target.startsAt), "2026-09-03T16:00");
  assert.equal(target.startsAt.toISOString(), "2026-09-03T08:00:00.000Z");
});

test("a session cancelled earlier can be put back on the calendar", () => {
  const target = rescheduleTarget("unscheduled", "2026-09-04T09:30");
  assert.ok(target);
  assert.equal(target.status, "scheduled");
  assert.match(formatDateTime(target.startsAt), /9:30/);
});

test("a completed session is never moved because the pack was already used", () => {
  assert.equal(rescheduleTarget("completed", "2026-09-03T16:00"), null);
});

test("an empty or unreadable time leaves the session untouched", () => {
  assert.equal(rescheduleTarget("scheduled", ""), null);
  assert.equal(rescheduleTarget("scheduled", "   "), null);
  assert.equal(rescheduleTarget("scheduled", "besok pagi"), null);
});
