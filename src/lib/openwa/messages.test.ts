import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_NOTICE_KIND,
  CUSTOMER_MANUAL_KIND,
  CUSTOMER_THANKS_KIND,
  MORNING_DIGEST_KIND,
  buildCustomerThanksMessage,
  buildMorningDigestMessage,
  destinationForKind,
  reminderHeadline,
} from "./messages";
import { shouldCountDispatchAttempt } from "./adapter";

test("thank-you includes exercise names when a log exists", () => {
  const payload = buildCustomerThanksMessage({
    name: "Made Ayu",
    exercises: [
      { name: "Goblet squat", sets: "3x6" },
      { name: "Bird dog", sets: "3x6/sisi" },
    ],
  });
  assert.match(payload, /terima kasih/i);
  assert.match(payload, /Goblet squat/);
  assert.match(payload, /Bird dog/);
  assert.match(payload, /3x6/);
});

test("thank-you stays a greeting when no exercises were logged", () => {
  const payload = buildCustomerThanksMessage({ name: "Mei", exercises: [] });
  assert.match(payload, /terima kasih/i);
  assert.doesNotMatch(payload, /Gerakan yang kamu selesaikan/);
  assert.doesNotMatch(payload, /• /);
});

test("morning digest is one list and respects threshold copy", () => {
  const payload = buildMorningDigestMessage({
    dateLabel: "30 Agu 2026",
    threshold: 2,
    customers: [
      { name: "I Gede Putra", phone: "081238110002", program: "Fat Loss Starter", remaining: 1 },
      { name: "Putu Lestari", phone: "081238110005", program: "Fat Loss Starter", remaining: 0 },
    ],
  });
  assert.match(payload, /ambang 2/);
  assert.match(payload, /I Gede Putra/);
  assert.match(payload, /Putu Lestari/);
  assert.match(payload, /sisa 1/);
  assert.match(payload, /sisa 0/);
});

test("empty digest does not invent customer rows", () => {
  const payload = buildMorningDigestMessage({
    dateLabel: "30 Agu 2026",
    threshold: 2,
    customers: [],
  });
  assert.match(payload, /Tidak ada customer aktif/);
  assert.doesNotMatch(payload, /• /);
});

test("destination routing keeps customer kinds off the admin phone", () => {
  assert.equal(
    destinationForKind(CUSTOMER_THANKS_KIND, "0812", "62851"),
    "0812",
  );
  assert.equal(
    destinationForKind(CUSTOMER_MANUAL_KIND, "0812", "62851"),
    "0812",
  );
  assert.equal(destinationForKind(ADMIN_NOTICE_KIND, "0812", "62851"), "62851");
  assert.equal(destinationForKind(MORNING_DIGEST_KIND, "0812", "62851"), "62851");
});

test("digest reminder has an admin headline when no customer is attached", () => {
  assert.equal(
    reminderHeadline({ kind: MORNING_DIGEST_KIND }),
    "Ringkasan pagi admin",
  );
});

test("localhost / enqueue failures do not burn dispatch attempts", () => {
  assert.equal(
    shouldCountDispatchAttempt({ sidecarReady: false, sendOk: false }),
    false,
  );
  assert.equal(
    shouldCountDispatchAttempt({
      sidecarReady: true,
      sendOk: false,
      error: "OpenWA tidak terjangkau di http://127.0.0.1:43201",
    }),
    false,
  );
  assert.equal(
    shouldCountDispatchAttempt({
      sidecarReady: true,
      sendOk: false,
      error: "OpenWA menolak kirim (400)",
    }),
    true,
  );
  assert.equal(
    shouldCountDispatchAttempt({ sidecarReady: true, sendOk: true }),
    true,
  );
});
