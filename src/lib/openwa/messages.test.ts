import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_MANUAL_KIND,
  ADMIN_NOTICE_KIND,
  CUSTOMER_THANKS_KIND,
  DEFAULT_ADMIN_MANUAL_TEMPLATE,
  DEFAULT_ADMIN_NOTICE_TEMPLATE,
  DEFAULT_CUSTOMER_THANKS_TEMPLATE,
  DEFAULT_MORNING_DIGEST_TEMPLATE,
  MORNING_DIGEST_KIND,
  applyTemplate,
  buildAdminManualMessage,
  buildCustomerThanksMessage,
  buildLowSessionMessage,
  buildMorningDigestMessage,
  destinationForKind,
  normalizeStoredTemplate,
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

test("only the post-session recap reaches the customer phone", () => {
  assert.equal(
    destinationForKind(CUSTOMER_THANKS_KIND, "0812", "62851"),
    "0812",
  );
  assert.equal(destinationForKind(ADMIN_MANUAL_KIND, "0812", "62851"), "62851");
  assert.equal(destinationForKind(ADMIN_NOTICE_KIND, "0812", "62851"), "62851");
  assert.equal(destinationForKind(MORNING_DIGEST_KIND, "0812", "62851"), "62851");
  // Session balance used to go straight to the customer. Old rows must not.
  assert.equal(destinationForKind("customer_manual", "0812", "62851"), "62851");
});

test("manual session-balance notice is worded for the admin, not the customer", () => {
  const payload = buildAdminManualMessage({
    name: "Calvin",
    phone: "6287771666730",
    remaining: 1,
    program: "Starter",
  });
  assert.match(payload, /Calvin/);
  assert.match(payload, /6287771666730/);
  assert.match(payload, /sisa 1 sesi program Starter/);
  assert.doesNotMatch(payload, /Hai Calvin|sesimu|kamu/i);
});

test("digest reminder has an admin headline when no customer is attached", () => {
  assert.equal(
    reminderHeadline({ kind: MORNING_DIGEST_KIND }),
    "Ringkasan pagi admin",
  );
});

const LOW_SESSION_INPUT = {
  name: "Putu Lestari",
  phone: "081238110005",
  remaining: 0,
  program: "Fat Loss Starter",
};

const MANUAL_INPUT = {
  name: "Mei",
  phone: "081238110009",
  remaining: 3,
  program: "Fat Loss",
};

const THANKS_EXERCISES = [
  { name: "Goblet squat", sets: "3x6" },
  { name: "Bird dog", sets: "3x6/sisi" },
];

const DIGEST_INPUT = {
  dateLabel: "30 Agu 2026",
  threshold: 2,
  customers: [
    { name: "I Gede Putra", phone: "081238110002", program: "Fat Loss Starter", remaining: 1 },
    { name: "Putu Lestari", phone: "081238110005", program: "Fat Loss Starter", remaining: 0 },
  ],
};

test("empty template uses today's hardcoded wording", () => {
  assert.equal(
    buildLowSessionMessage({ ...LOW_SESSION_INPUT, template: "" }),
    buildLowSessionMessage(LOW_SESSION_INPUT),
  );
  assert.equal(
    buildLowSessionMessage({ ...LOW_SESSION_INPUT, remaining: 2 }),
    "Notice FortyFit: Putu Lestari (081238110005) sisa 2 sesi Fat Loss Starter. Tinggal 2x lagi habis. Follow-up perpanjang.",
  );
  assert.equal(
    buildLowSessionMessage(LOW_SESSION_INPUT),
    "Notice FortyFit: Putu Lestari (081238110005) sisa 0 sesi Fat Loss Starter. Paket sudah habis. Follow-up perpanjang.",
  );
  assert.equal(
    buildAdminManualMessage({ ...MANUAL_INPUT, template: "   " }),
    "Cek sisa sesi FortyFit: Mei (081238110009) sisa 3 sesi program Fat Loss. Hubungi dia untuk memastikan jadwal latihan berikutnya.",
  );
  assert.equal(
    buildAdminManualMessage({ ...MANUAL_INPUT, remaining: 0 }),
    "Cek sisa sesi FortyFit: Mei (081238110009) paket Fat Loss sudah habis. Hubungi dia untuk memastikan jadwal latihan berikutnya.",
  );
  assert.equal(
    buildCustomerThanksMessage({ name: "Mei", exercises: [], template: null }),
    buildCustomerThanksMessage({ name: "Mei", exercises: [] }),
  );
  assert.equal(
    buildMorningDigestMessage({ ...DIGEST_INPUT, customers: [], template: undefined }),
    buildMorningDigestMessage({ ...DIGEST_INPUT, customers: [] }),
  );
});

test("default templates substitute to the same wording as empty settings", () => {
  assert.equal(
    buildLowSessionMessage({
      ...LOW_SESSION_INPUT,
      template: DEFAULT_ADMIN_NOTICE_TEMPLATE,
    }),
    buildLowSessionMessage(LOW_SESSION_INPUT),
  );
  assert.equal(
    buildLowSessionMessage({
      ...LOW_SESSION_INPUT,
      remaining: 1,
      template: DEFAULT_ADMIN_NOTICE_TEMPLATE,
    }),
    buildLowSessionMessage({ ...LOW_SESSION_INPUT, remaining: 1 }),
  );
  assert.equal(
    buildAdminManualMessage({
      ...MANUAL_INPUT,
      template: DEFAULT_ADMIN_MANUAL_TEMPLATE,
    }),
    buildAdminManualMessage(MANUAL_INPUT),
  );
  assert.equal(
    buildCustomerThanksMessage({
      name: "Made Ayu",
      exercises: THANKS_EXERCISES,
      template: DEFAULT_CUSTOMER_THANKS_TEMPLATE,
    }),
    buildCustomerThanksMessage({ name: "Made Ayu", exercises: THANKS_EXERCISES }),
  );
  assert.equal(
    buildCustomerThanksMessage({
      name: "Mei",
      exercises: [],
      template: DEFAULT_CUSTOMER_THANKS_TEMPLATE,
    }),
    buildCustomerThanksMessage({ name: "Mei", exercises: [] }),
  );
  assert.equal(
    buildCustomerThanksMessage({
      name: "Mei",
      exercises: [],
      template: DEFAULT_CUSTOMER_THANKS_TEMPLATE.replace(/\n/g, "\r\n"),
    }),
    buildCustomerThanksMessage({ name: "Mei", exercises: [] }),
  );
  assert.equal(
    buildMorningDigestMessage({
      ...DIGEST_INPUT,
      template: DEFAULT_MORNING_DIGEST_TEMPLATE,
    }),
    buildMorningDigestMessage(DIGEST_INPUT),
  );
  assert.equal(
    buildMorningDigestMessage({
      ...DIGEST_INPUT,
      customers: [],
      template: DEFAULT_MORNING_DIGEST_TEMPLATE,
    }),
    buildMorningDigestMessage({ ...DIGEST_INPUT, customers: [] }),
  );
});

test("custom templates fill Indonesian placeholders", () => {
  assert.equal(
    buildLowSessionMessage({
      ...LOW_SESSION_INPUT,
      remaining: 2,
      template: "Hai admin, {nama} sisa {sisa} ({program}) {telepon}",
    }),
    "Hai admin, Putu Lestari sisa 2 (Fat Loss Starter) 081238110005",
  );
  assert.equal(
    buildAdminManualMessage({
      ...MANUAL_INPUT,
      template: "Halo admin, {nama} sisa {sisa} untuk {program}.",
    }),
    "Halo admin, Mei sisa 3 untuk Fat Loss.",
  );
  const thanks = buildCustomerThanksMessage({
    name: "Made Ayu",
    exercises: THANKS_EXERCISES,
    template: "Makasih {nama}.\n{gerakan}",
  });
  assert.match(thanks, /Makasih Made Ayu/);
  assert.match(thanks, /Goblet squat \(3x6\)/);
  assert.match(thanks, /Bird dog \(3x6\/sisi\)/);
  assert.equal(
    buildMorningDigestMessage({
      ...DIGEST_INPUT,
      template: "Digest {tanggal} ambang {ambang}\n{daftar}",
    }).split("\n")[0],
    "Digest 30 Agu 2026 ambang 2",
  );
});

test("missing placeholder values fall back without breaking the message", () => {
  assert.equal(
    applyTemplate("Hai {nama}, program {program} sisa {sisa}", {
      nama: "Mei",
      program: "FortyFit",
      sisa: "0",
    }),
    "Hai Mei, program FortyFit sisa 0",
  );
  assert.equal(
    applyTemplate("Hai {nama} {xyz}", { nama: "Mei" }),
    "Hai Mei {xyz}",
  );
  assert.equal(
    buildAdminManualMessage({
      name: "",
      remaining: 2,
      program: "",
      template: "Cek {nama} / {program}",
    }),
    "Cek customer / FortyFit",
  );
  assert.equal(
    buildCustomerThanksMessage({
      name: "Mei",
      exercises: [],
      template: "Hai {nama}.\n{gerakan}\nSampai jumpa.",
    }),
    "Hai Mei.\nSampai jumpa.",
  );
  assert.equal(
    normalizeStoredTemplate(DEFAULT_ADMIN_NOTICE_TEMPLATE, DEFAULT_ADMIN_NOTICE_TEMPLATE),
    "",
  );
  assert.equal(
    normalizeStoredTemplate(
      DEFAULT_CUSTOMER_THANKS_TEMPLATE.replace(/\n/g, "\r\n"),
      DEFAULT_CUSTOMER_THANKS_TEMPLATE,
    ),
    "",
  );
  assert.equal(normalizeStoredTemplate("Halo {nama}", DEFAULT_ADMIN_NOTICE_TEMPLATE), "Halo {nama}");
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
