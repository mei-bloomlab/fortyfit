import assert from "node:assert/strict";
import test from "node:test";
import {
  findClashes,
  hoursNotice,
  noticeLabel,
  rescheduleTarget,
} from "./scheduling";
import { formatDateTime, parseStudioDateTime, toLocalInputValue } from "./time";

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

test("notice is counted in whole hours from the change to the original time", () => {
  const session = parseStudioDateTime("2026-09-02T19:00");
  assert.equal(hoursNotice(session, parseStudioDateTime("2026-09-02T17:30")), 1);
  assert.equal(hoursNotice(session, parseStudioDateTime("2026-09-01T19:00")), 24);
  assert.equal(hoursNotice(session, parseStudioDateTime("2026-09-02T18:59")), 0);
});

test("a session cancelled after it already passed still counts as zero notice", () => {
  const session = parseStudioDateTime("2026-09-02T19:00");
  assert.equal(hoursNotice(session, parseStudioDateTime("2026-09-02T21:00")), 0);
});

test("a slot that was never scheduled has no notice to measure", () => {
  assert.equal(hoursNotice(null, new Date()), null);
  assert.equal(hoursNotice(undefined, new Date()), null);
});

test("only short notice earns a badge", () => {
  assert.equal(noticeLabel(0), "mendadak");
  assert.equal(noticeLabel(5), "mendadak");
  assert.equal(noticeLabel(6), "kurang dari sehari");
  assert.equal(noticeLabel(23), "kurang dari sehari");
  assert.equal(noticeLabel(24), null);
  assert.equal(noticeLabel(null), null);
});

const busy = [
  {
    id: "a1",
    name: "Ocean",
    startsAt: parseStudioDateTime("2026-09-02T19:00").toISOString(),
    durationMin: 60,
  },
  {
    id: "a2",
    name: "Putro",
    startsAt: parseStudioDateTime("2026-09-03T07:00").toISOString(),
    durationMin: 60,
  },
];

test("an overlapping hour is reported with the name already booked", () => {
  assert.deepEqual(
    findClashes("2026-09-02T19:00", busy).map((slot) => slot.name),
    ["Ocean"],
  );
  assert.deepEqual(
    findClashes("2026-09-02T19:30", busy).map((slot) => slot.name),
    ["Ocean"],
  );
  assert.deepEqual(
    findClashes("2026-09-02T18:30", busy).map((slot) => slot.name),
    ["Ocean"],
  );
});

test("back-to-back sessions do not count as a clash", () => {
  assert.deepEqual(findClashes("2026-09-02T20:00", busy), []);
  assert.deepEqual(findClashes("2026-09-02T18:00", busy), []);
});

test("moving a session to its own time is not a clash with itself", () => {
  assert.deepEqual(findClashes("2026-09-02T19:00", busy, { ignoreId: "a1" }), []);
});

test("a blank or unreadable pick warns about nothing", () => {
  assert.deepEqual(findClashes("", busy), []);
  assert.deepEqual(findClashes("kapan aja", busy), []);
});
