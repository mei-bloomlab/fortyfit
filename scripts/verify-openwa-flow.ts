import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { enqueueCustomerThanks } from "../src/lib/loops/customer-thanks";
import { enqueueMorningDigestIfDue } from "../src/lib/loops/morning-digest";
import { dispatchPendingReminders } from "../src/lib/loops/reminder-dispatch";
import { completeAppointment } from "../src/lib/loops/attendance";
import { shouldCountDispatchAttempt } from "../src/lib/openwa/adapter";

const prisma = new PrismaClient();

async function main() {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL required");

  await prisma.studioSettings.upsert({
    where: { id: "fortyfit" },
    update: {
      reminderThreshold: 2,
      adminPhone: "6285155070866",
      autoNotifyAdmin: true,
      customerThanksEnabled: true,
      morningDigestEnabled: true,
      morningDigestTime: "09:30",
      timezone: "Asia/Makassar",
      lastMorningDigestOn: null,
    },
    create: {
      id: "fortyfit",
      reminderThreshold: 2,
      adminPhone: "6285155070866",
      morningDigestTime: "09:30",
      timezone: "Asia/Makassar",
    },
  });

  const customer = await prisma.customer.create({
    data: {
      name: "Verify Thanks",
      phone: "081200099900",
      goal: "Tes OpenWA",
      status: "active",
      packs: {
        create: {
          program: "Fat Loss",
          purchased: 4,
          used: 1,
          remaining: 3,
        },
      },
    },
    include: { packs: true },
  });
  const pack = customer.packs[0];
  const appointment = await prisma.appointment.create({
    data: {
      customerId: customer.id,
      packId: pack.id,
      slot: 2,
      startsAt: new Date("2026-08-30T01:00:00.000Z"),
      status: "scheduled",
    },
  });
  await prisma.workoutLog.create({
    data: {
      customerId: customer.id,
      appointmentId: appointment.id,
      performedAt: new Date("2026-08-30T01:00:00.000Z"),
      focus: "Squat",
      exercisesJson: JSON.stringify([
        { name: "Goblet squat", sets: "3x8" },
        { name: "Bird dog", sets: "3x6" },
      ]),
    },
  });

  await completeAppointment(appointment.id);
  const thanks = await enqueueCustomerThanks(appointment.id);
  assert.ok(thanks.createdId, thanks.reason);

  const reminder = await prisma.reminder.findUniqueOrThrow({
    where: { id: thanks.createdId },
  });
  assert.equal(reminder.kind, "customer_thanks");
  assert.equal(reminder.status, "pending");
  assert.match(reminder.payload, /Goblet squat/);
  assert.match(reminder.payload, /Bird dog/);
  assert.match(reminder.payload, /terima kasih/i);

  const again = await enqueueCustomerThanks(appointment.id);
  assert.equal(again.skipped, true);

  const before0930 = await enqueueMorningDigestIfDue(
    new Date("2026-08-30T01:29:00.000Z"),
  );
  assert.equal(before0930.skipped, true);

  const digest = await enqueueMorningDigestIfDue(
    new Date("2026-08-30T01:30:00.000Z"),
  );
  assert.ok(digest.createdId, digest.reason);
  assert.equal(digest.localDate, "2026-08-30");

  const digestRow = await prisma.reminder.findUniqueOrThrow({
    where: { id: digest.createdId },
  });
  assert.equal(digestRow.kind, "morning_digest");
  assert.match(digestRow.payload, /ambang 2/);
  assert.match(digestRow.payload, /sisa /);

  const lateSameDay = await enqueueMorningDigestIfDue(
    new Date("2026-08-30T03:00:00.000Z"),
  );
  assert.equal(lateSameDay.skipped, true);

  const settings = await prisma.studioSettings.findUniqueOrThrow({
    where: { id: "fortyfit" },
  });
  assert.equal(settings.lastMorningDigestOn, "2026-08-30");
  assert.equal(settings.morningDigestTime, "09:30");

  const dispatch = await dispatchPendingReminders();
  assert.equal(dispatch.sent.length, 0);
  assert.ok(dispatch.deferred.length > 0);

  const stillPending = await prisma.reminder.findMany({
    where: { id: { in: [thanks.createdId, digest.createdId] } },
  });
  for (const row of stillPending) {
    assert.equal(row.status, "pending");
    assert.equal(row.attempts, 0);
  }

  assert.equal(
    shouldCountDispatchAttempt({ sidecarReady: false, sendOk: false }),
    false,
  );

  console.log("verify-openwa-flow: ok");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
