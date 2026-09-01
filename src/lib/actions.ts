"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { GOALS, PROGRAMS } from "@/lib/engineering/rules";
import { WIPE_CUSTOMERS_CONFIRM } from "@/lib/labels";
import {
  enqueueAdminManualReminder,
  retryFailedReminder,
  skipReminder,
} from "@/lib/loops/reminder-dispatch";
import { exercisesFromFormData, saveWorkoutLog } from "@/lib/loops/workout-log";
import { runOpsGraph } from "@/lib/ops-graph";
import { normalizeDigestTime } from "@/lib/openwa/digest";
import {
  DEFAULT_ADMIN_MANUAL_TEMPLATE,
  DEFAULT_ADMIN_NOTICE_TEMPLATE,
  DEFAULT_CUSTOMER_THANKS_TEMPLATE,
  DEFAULT_MORNING_DIGEST_TEMPLATE,
  normalizeStoredTemplate,
} from "@/lib/openwa/messages";
import { parseSessionCount, sessionSlotRows } from "@/lib/session-slots";
import { defaultSessionsForPackage, fallbackProgramName } from "@/lib/studio-catalog";
import { parseStudioDateTime } from "@/lib/time";

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function refreshStudio() {
  revalidatePath("/admin");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/calendar");
  revalidatePath("/admin/jadwal");
  revalidatePath("/admin/reminders");
  revalidatePath("/admin/setting");
}

async function resolveProgram(formData: FormData) {
  const name = readString(formData, "program");
  const match = name
    ? await prisma.programPackage.findFirst({
        where: { name, archived: false },
      })
    : await prisma.programPackage.findFirst({
        where: { archived: false },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      });
  const program = match?.name ?? name ?? fallbackProgramName() ?? PROGRAMS[0];
  return {
    program,
    priceIdr: match?.priceIdr ?? null,
    sessions: match?.sessions ?? defaultSessionsForPackage(program),
  };
}

function readPurchasedSessions(formData: FormData, fallback: number) {
  return parseSessionCount(readString(formData, "purchased") || String(fallback), fallback);
}

function readPackageSessions(formData: FormData) {
  return parseSessionCount(readString(formData, "sessions"), 8);
}

function studioPath(value: string, fallback = "/admin/jadwal") {
  return value.startsWith("/admin") ? value : fallback;
}

export async function createLeadAction(formData: FormData) {
  const name = readString(formData, "name");
  const phone = readString(formData, "phone");
  if (!name || !phone) return;

  await prisma.customer.create({
    data: {
      name,
      phone,
      goal: readString(formData, "goal") || GOALS[0],
      notes: readString(formData, "notes") || "Lead dari situs publik",
      status: "lead",
    },
  });

  refreshStudio();
  redirect("/?terkirim=1");
}

export async function createCustomerAction(formData: FormData) {
  const name = readString(formData, "name");
  const phone = readString(formData, "phone");
  if (!name || !phone) return;

  const { program, priceIdr, sessions } = await resolveProgram(formData);
  const purchased = readPurchasedSessions(formData, sessions);
  const kondisi = readString(formData, "notes") || readString(formData, "kondisi");

  const customer = await prisma.customer.create({
    data: {
      name,
      phone,
      email: readString(formData, "email") || null,
      goal: kondisi || program || GOALS[0],
      notes: kondisi || null,
      packs: {
        create: {
          program,
          priceIdr,
          purchased,
          used: 0,
          remaining: purchased,
        },
      },
    },
    include: { packs: true },
  });

  const pack = customer.packs[0];
  if (pack) {
    await prisma.appointment.createMany({
      data: sessionSlotRows(customer.id, pack.id, purchased),
    });
  }

  refreshStudio();
  revalidatePath(`/admin/customers/${customer.id}`);
  redirect(`/admin/customers/${customer.id}`);
}

export async function addPackAction(formData: FormData) {
  const customerId = readString(formData, "customerId");
  const { program, priceIdr, sessions } = await resolveProgram(formData);
  const purchased = readPurchasedSessions(formData, sessions);
  const pack = await prisma.sessionPack.create({
    data: {
      customerId,
      program,
      priceIdr,
      purchased,
      used: 0,
      remaining: purchased,
    },
  });
  await prisma.appointment.createMany({
    data: sessionSlotRows(customerId, pack.id, purchased),
  });
  refreshStudio();
  revalidatePath(`/admin/customers/${customerId}`);
}

export async function updateCustomerAction(formData: FormData) {
  const customerId = readString(formData, "customerId");
  if (!customerId) return;

  const name = readString(formData, "name");
  const phone = readString(formData, "phone");
  const program = readString(formData, "program");
  const kondisi = readString(formData, "notes") || readString(formData, "kondisi");
  if (!name || !phone) return;

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      name,
      phone,
      notes: kondisi || null,
      goal: kondisi || program || GOALS[0],
    },
  });

  const pack = await prisma.sessionPack.findFirst({
    where: { customerId },
    orderBy: { purchasedAt: "desc" },
  });
  if (pack && program) {
    const catalog = await prisma.programPackage.findFirst({
      where: { name: program, archived: false },
    });
    await prisma.sessionPack.update({
      where: { id: pack.id },
      data: {
        program,
        ...(catalog ? { priceIdr: catalog.priceIdr } : {}),
      },
    });
  }

  refreshStudio();
  revalidatePath(`/admin/customers/${customerId}`);
}

export async function saveSessionSlotAction(formData: FormData) {
  const appointmentId = readString(formData, "appointmentId");
  const customerId = readString(formData, "customerId");
  const startsAt = readString(formData, "startsAt");
  if (!appointmentId) return;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });
  if (!appointment) return;

  if (!startsAt) {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        startsAt: null,
        status: appointment.status === "completed" ? "completed" : "unscheduled",
      },
    });
  } else {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        startsAt: parseStudioDateTime(startsAt),
        status: appointment.status === "completed" ? "completed" : "scheduled",
      },
    });
  }

  refreshStudio();
  revalidatePath(`/admin/customers/${customerId || appointment.customerId}`);
}

export async function scheduleOpenSlotAction(formData: FormData) {
  const customerId = readString(formData, "customerId");
  const startsAt = readString(formData, "startsAt");
  if (!customerId || !startsAt) return;

  const pack = await prisma.sessionPack.findFirst({
    where: { customerId, remaining: { gt: 0 } },
    orderBy: { purchasedAt: "asc" },
  });
  if (!pack) return;

  const emptySlot = await prisma.appointment.findFirst({
    where: { packId: pack.id, status: "unscheduled" },
    orderBy: { slot: "asc" },
  });
  if (!emptySlot) return;

  await prisma.appointment.update({
    where: { id: emptySlot.id },
    data: {
      startsAt: parseStudioDateTime(startsAt),
      status: "scheduled",
      location: "Studio Tabanan",
    },
  });

  refreshStudio();
  revalidatePath(`/admin/customers/${customerId}`);
}

export async function addAppointmentAction(formData: FormData) {
  const customerId = readString(formData, "customerId");
  const startsAt = readString(formData, "startsAt");
  if (!customerId || !startsAt) return;

  const pack = await prisma.sessionPack.findFirst({
    where: { customerId, remaining: { gt: 0 } },
    orderBy: { purchasedAt: "asc" },
  });

  const emptySlot = pack
    ? await prisma.appointment.findFirst({
        where: { packId: pack.id, status: "unscheduled" },
        orderBy: { slot: "asc" },
      })
    : null;

  if (emptySlot) {
    await prisma.appointment.update({
      where: { id: emptySlot.id },
      data: {
        startsAt: parseStudioDateTime(startsAt),
        status: "scheduled",
        durationMin: Number(readString(formData, "durationMin") || "60"),
        location: readString(formData, "location") || "Studio Tabanan",
      },
    });
  } else {
    const last = await prisma.appointment.findFirst({
      where: { packId: pack?.id ?? undefined, customerId },
      orderBy: { slot: "desc" },
    });
    await prisma.appointment.create({
      data: {
        customerId,
        packId: pack?.id,
        slot: (last?.slot ?? 0) + 1,
        startsAt: parseStudioDateTime(startsAt),
        status: "scheduled",
        durationMin: Number(readString(formData, "durationMin") || "60"),
        location: readString(formData, "location") || "Studio Tabanan",
      },
    });
  }

  refreshStudio();
  revalidatePath(`/admin/customers/${customerId}`);
}

async function workoutFromSessionForm(formData: FormData) {
  const appointmentId = readString(formData, "appointmentId");
  const customerId = readString(formData, "customerId");
  const exercises = exercisesFromFormData(formData);
  if (!appointmentId || !customerId || exercises.length === 0) return null;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });
  if (!appointment || appointment.status === "completed") return null;

  return {
    customerId: appointment.customerId,
    appointmentId,
    performedAt: appointment.startsAt ?? new Date(),
    focus: readString(formData, "focus") || exercises[0]?.name || "Sesi",
    exercises,
    coachNote: readString(formData, "coachNote") || undefined,
  };
}

export async function saveSessionWorkoutAction(formData: FormData) {
  const workout = await workoutFromSessionForm(formData);
  if (!workout) return;

  await saveWorkoutLog(workout);

  refreshStudio();
  revalidatePath(`/admin/customers/${workout.customerId}`);
  revalidatePath(`/admin/jadwal/${workout.appointmentId}`);

  const next = readString(formData, "redirectTo");
  if (next) redirect(studioPath(next));
}

export async function completeSessionAction(formData: FormData) {
  const appointmentId = readString(formData, "appointmentId");
  const customerId = readString(formData, "customerId");
  const workout = await workoutFromSessionForm(formData);
  if (workout) {
    await saveWorkoutLog(workout);
  }

  await runOpsGraph({
    trigger: "complete_session",
    appointmentId,
    workout: workout ?? undefined,
  });

  refreshStudio();
  revalidatePath(`/admin/customers/${customerId}`);
  if (appointmentId) {
    revalidatePath(`/admin/jadwal/${appointmentId}`);
  }

  const next = readString(formData, "redirectTo");
  if (next) redirect(studioPath(next));
}

export async function cancelAppointmentAction(formData: FormData) {
  "use server";

  const appointmentId = readString(formData, "appointmentId");
  if (!appointmentId) return;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });
  if (!appointment) return;
  if (appointment.status === "completed") return;

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      startsAt: null,
      status: "unscheduled",
    },
  });

  refreshStudio();
  revalidatePath("/admin/jadwal");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/calendar");
  revalidatePath(`/admin/customers/${appointment.customerId}`);
  revalidatePath(`/admin/jadwal/${appointmentId}`);
  redirect(studioPath(readString(formData, "redirectTo") || "/admin/jadwal"));
}

export async function addWorkoutAction(formData: FormData) {
  const customerId = readString(formData, "customerId");
  const focus = readString(formData, "focus");
  const exercises = exercisesFromFormData(formData);

  await runOpsGraph({
    trigger: "log_workout",
    workout: {
      customerId,
      performedAt: new Date(readString(formData, "performedAt") || Date.now()),
      focus,
      exercises,
      coachNote: readString(formData, "coachNote") || undefined,
    },
  });

  refreshStudio();
  revalidatePath(`/admin/customers/${customerId}`);
}

export async function scanAndDispatchAction() {
  const state = await runOpsGraph({ trigger: "scan" });
  if (state.reminderIds.length === 0) {
    await runOpsGraph({ trigger: "dispatch" });
  }
  refreshStudio();
}

export async function dispatchRemindersAction() {
  await runOpsGraph({ trigger: "dispatch" });
  refreshStudio();
}

export async function retryReminderAction(formData: FormData) {
  await retryFailedReminder(readString(formData, "id"));
  await runOpsGraph({ trigger: "dispatch" });
  refreshStudio();
}

export async function skipReminderAction(formData: FormData) {
  await skipReminder(readString(formData, "id"));
  refreshStudio();
}

export async function updateThresholdAction(formData: FormData) {
  const threshold = Number(readString(formData, "threshold") || "2");
  const adminPhone = readString(formData, "adminPhone");
  const autoNotifyAdmin = formData.get("autoNotifyAdmin") === "1";
  await prisma.studioSettings.upsert({
    where: { id: "fortyfit" },
    update: {
      reminderThreshold: Number.isFinite(threshold) ? threshold : 2,
      autoNotifyAdmin,
      ...(adminPhone ? { adminPhone } : {}),
    },
    create: {
      id: "fortyfit",
      reminderThreshold: Number.isFinite(threshold) ? threshold : 2,
      adminPhone: adminPhone || "6285155070866",
      autoNotifyAdmin,
    },
  });
  refreshStudio();
}

export async function updateNotifySettingsAction(formData: FormData) {
  const threshold = Number(readString(formData, "threshold") || "2");
  const hasAutoField = formData.has("autoNotifyAdminField");
  const autoNotifyAdmin = formData.get("autoNotifyAdmin") === "1";
  const hasThanksField = formData.has("customerThanksEnabledField");
  const customerThanksEnabled = formData.get("customerThanksEnabled") === "1";
  await prisma.studioSettings.upsert({
    where: { id: "fortyfit" },
    update: {
      reminderThreshold: Number.isFinite(threshold) ? threshold : 2,
      ...(hasAutoField ? { autoNotifyAdmin } : {}),
      ...(hasThanksField ? { customerThanksEnabled } : {}),
    },
    create: {
      id: "fortyfit",
      reminderThreshold: Number.isFinite(threshold) ? threshold : 2,
      autoNotifyAdmin: hasAutoField ? autoNotifyAdmin : true,
      customerThanksEnabled: hasThanksField ? customerThanksEnabled : true,
    },
  });
  refreshStudio();
}

export async function updateMorningDigestAction(formData: FormData) {
  const morningDigestEnabled = formData.get("morningDigestEnabled") === "1";
  const morningDigestTime = normalizeDigestTime(readString(formData, "morningDigestTime"));
  const timezone = readString(formData, "timezone") || "Asia/Makassar";
  await prisma.studioSettings.upsert({
    where: { id: "fortyfit" },
    update: {
      morningDigestEnabled,
      morningDigestTime,
      timezone,
    },
    create: {
      id: "fortyfit",
      morningDigestEnabled,
      morningDigestTime,
      timezone,
    },
  });
  refreshStudio();
}

export async function updateAdminPhoneAction(formData: FormData) {
  const adminPhone = readString(formData, "adminPhone");
  if (!adminPhone) return;
  await prisma.studioSettings.upsert({
    where: { id: "fortyfit" },
    update: { adminPhone },
    create: { id: "fortyfit", adminPhone },
  });
  refreshStudio();
}

export async function updateWaTemplatesAction(formData: FormData) {
  const waTplAdminNotice = normalizeStoredTemplate(
    readString(formData, "waTplAdminNotice"),
    DEFAULT_ADMIN_NOTICE_TEMPLATE,
  );
  const waTplAdminManual = normalizeStoredTemplate(
    readString(formData, "waTplAdminManual"),
    DEFAULT_ADMIN_MANUAL_TEMPLATE,
  );
  const waTplCustomerThanks = normalizeStoredTemplate(
    readString(formData, "waTplCustomerThanks"),
    DEFAULT_CUSTOMER_THANKS_TEMPLATE,
  );
  const waTplMorningDigest = normalizeStoredTemplate(
    readString(formData, "waTplMorningDigest"),
    DEFAULT_MORNING_DIGEST_TEMPLATE,
  );
  await prisma.studioSettings.upsert({
    where: { id: "fortyfit" },
    update: {
      waTplAdminNotice,
      waTplAdminManual,
      waTplCustomerThanks,
      waTplMorningDigest,
    },
    create: {
      id: "fortyfit",
      waTplAdminNotice,
      waTplAdminManual,
      waTplCustomerThanks,
      waTplMorningDigest,
    },
  });
  refreshStudio();
}

export async function createPackageAction(formData: FormData) {
  const name = readString(formData, "name");
  const sessions = readPackageSessions(formData);
  const priceIdr = Number(readString(formData, "priceIdr").replace(/\D/g, "") || "0");
  if (!name || !Number.isFinite(priceIdr) || priceIdr < 0) return;

  const existing = await prisma.programPackage.findUnique({ where: { name } });
  if (existing) {
    await prisma.programPackage.update({
      where: { id: existing.id },
      data: { sessions, priceIdr, archived: false },
    });
  } else {
    const last = await prisma.programPackage.findFirst({
      orderBy: { sortOrder: "desc" },
    });
    await prisma.programPackage.create({
      data: {
        name,
        sessions,
        priceIdr,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });
  }
  refreshStudio();
}

export async function updatePackageAction(formData: FormData) {
  const id = readString(formData, "id");
  const name = readString(formData, "name");
  const sessions = readPackageSessions(formData);
  const priceIdr = Number(readString(formData, "priceIdr").replace(/\D/g, "") || "0");
  if (!id || !name || !Number.isFinite(priceIdr) || priceIdr < 0) return;

  const clash = await prisma.programPackage.findFirst({
    where: { name, NOT: { id } },
  });
  if (clash) return;

  await prisma.programPackage.update({
    where: { id },
    data: { name, sessions, priceIdr },
  });
  refreshStudio();
}

export async function archivePackageAction(formData: FormData) {
  const id = readString(formData, "id");
  if (!id) return;
  await prisma.programPackage.update({
    where: { id },
    data: { archived: true },
  });
  refreshStudio();
}

export async function restorePackageAction(formData: FormData) {
  const id = readString(formData, "id");
  if (!id) return;
  await prisma.programPackage.update({
    where: { id },
    data: { archived: false },
  });
  refreshStudio();
}

export async function createExerciseAction(formData: FormData) {
  const name = readString(formData, "name");
  if (!name) return;

  const existing = await prisma.exerciseType.findUnique({ where: { name } });
  if (existing) {
    await prisma.exerciseType.update({
      where: { id: existing.id },
      data: { archived: false },
    });
  } else {
    const last = await prisma.exerciseType.findFirst({
      orderBy: { sortOrder: "desc" },
    });
    await prisma.exerciseType.create({
      data: {
        name,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });
  }
  refreshStudio();
}

export async function archiveExerciseAction(formData: FormData) {
  const id = readString(formData, "id");
  if (!id) return;
  await prisma.exerciseType.update({
    where: { id },
    data: { archived: true },
  });
  refreshStudio();
}

export async function restoreExerciseAction(formData: FormData) {
  const id = readString(formData, "id");
  if (!id) return;
  await prisma.exerciseType.update({
    where: { id },
    data: { archived: false },
  });
  refreshStudio();
}

export async function sendAdminSessionNoticeAction(formData: FormData) {
  const customerId = readString(formData, "customerId");
  if (!customerId) return;

  await enqueueAdminManualReminder(customerId);
  refreshStudio();
  revalidatePath(`/admin/customers/${customerId}`);
}

export async function wipeCustomersAction(formData: FormData) {
  if (readString(formData, "confirm") !== WIPE_CUSTOMERS_CONFIRM) return;

  await prisma.$transaction(async (tx) => {
    await tx.reminder.deleteMany();
    await tx.workoutLog.deleteMany();
    await tx.appointment.deleteMany();
    await tx.sessionPack.deleteMany();
    await tx.customer.deleteMany();
    await tx.graphRun.deleteMany();
  });

  refreshStudio();
  redirect("/admin/customers");
}
