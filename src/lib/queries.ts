import { addDays, endOfMonth, startOfMonth } from "date-fns";
import { prisma } from "@/lib/db";
import {
  DEFAULT_EXERCISES,
  DEFAULT_PACKAGES,
  PACKAGE_SESSION_DEFAULTS,
} from "@/lib/studio-catalog";
import type { BusySlot } from "@/lib/scheduling";
import { startOfStudioDay } from "@/lib/time";

export type { CatalogExercise, CatalogPackage } from "@/lib/studio-catalog";

export async function ensureStudioCatalog() {
  const [packageCount, exerciseCount] = await Promise.all([
    prisma.programPackage.count(),
    prisma.exerciseType.count(),
  ]);

  if (packageCount === 0) {
    await prisma.programPackage.createMany({ data: DEFAULT_PACKAGES });
  } else {
    await backfillKnownPackageSessions();
  }
  if (exerciseCount === 0) {
    await prisma.exerciseType.createMany({ data: DEFAULT_EXERCISES });
  }
}

async function backfillKnownPackageSessions() {
  const names = Object.keys(PACKAGE_SESSION_DEFAULTS);
  const rows = await prisma.programPackage.findMany({
    where: { name: { in: names } },
    select: { id: true, name: true, sessions: true },
  });
  if (rows.length === 0) return;

  const looksLikeColumnDefault = rows.every((row) => row.sessions === 8);
  if (!looksLikeColumnDefault) return;

  await Promise.all(
    rows.map((row) =>
      prisma.programPackage.update({
        where: { id: row.id },
        data: { sessions: PACKAGE_SESSION_DEFAULTS[row.name] ?? row.sessions },
      }),
    ),
  );
}

export async function listPackages(includeArchived = false) {
  await ensureStudioCatalog();
  return prisma.programPackage.findMany({
    where: includeArchived ? undefined : { archived: false },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function listExercises(includeArchived = false) {
  await ensureStudioCatalog();
  return prisma.exerciseType.findMany({
    where: includeArchived ? undefined : { archived: false },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getSettingsPageData() {
  const [settings, packages, exercises, customerCount] = await Promise.all([
    getSettings(),
    listPackages(true),
    listExercises(true),
    prisma.customer.count(),
  ]);
  return { settings, packages, exercises, customerCount };
}

export async function getDashboardData() {
  const today = startOfStudioDay();
  const tomorrow = addDays(today, 1);

  const settings = await getSettings();
  const threshold = settings.reminderThreshold;

  const [customers, todayAppointments, lowPacks, pendingReminders] =
    await Promise.all([
      prisma.customer.count({ where: { status: "active" } }),
      prisma.appointment.findMany({
        where: {
          startsAt: { gte: today, lt: tomorrow },
          status: { not: "cancelled" },
        },
        include: { customer: true, pack: true, workout: true },
        orderBy: { startsAt: "asc" },
      }),
      prisma.sessionPack.findMany({
        where: {
          remaining: { lte: threshold },
          customer: { status: "active" },
        },
        include: { customer: true },
        orderBy: { remaining: "asc" },
      }),
      prisma.reminder.findMany({
        where: { status: { in: ["pending", "failed"] } },
        include: { customer: true, pack: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  return {
    customers,
    todayAppointments,
    lowPacks,
    pendingReminders,
    threshold,
    adminPhone: settings.adminPhone,
    autoNotifyAdmin: settings.autoNotifyAdmin,
  };
}

export async function listCustomers() {
  return prisma.customer.findMany({
    include: {
      packs: { orderBy: { purchasedAt: "desc" } },
      appointments: {
        where: {
          status: "scheduled",
          startsAt: { gte: new Date() },
        },
        orderBy: { startsAt: "asc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function getCustomer(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      packs: { orderBy: { purchasedAt: "desc" } },
      appointments: {
        include: { pack: true, workout: true },
        orderBy: [{ slot: "asc" }, { createdAt: "asc" }],
      },
      workouts: { orderBy: { performedAt: "desc" } },
      reminders: { orderBy: { createdAt: "desc" }, take: 8 },
      events: { orderBy: { createdAt: "desc" }, take: 12 },
    },
  });
}

/** Every session still on the calendar from today onward, for clash warnings. */
export async function listBusySlots(): Promise<BusySlot[]> {
  const rows = await prisma.appointment.findMany({
    where: { status: "scheduled", startsAt: { gte: startOfStudioDay() } },
    include: { customer: { select: { name: true } } },
    orderBy: { startsAt: "asc" },
  });

  return rows.flatMap((row) =>
    row.startsAt
      ? [
          {
            id: row.id,
            name: row.customer.name,
            startsAt: row.startsAt.toISOString(),
            durationMin: row.durationMin,
          },
        ]
      : [],
  );
}

export type ScheduleCustomer = {
  id: string;
  name: string;
  phone: string;
  kondisi: string | null;
  program: string;
  purchased: number;
  used: number;
  remaining: number;
  openSlots: number;
  nextSlot: number | null;
  scheduledAppointments: {
    id: string;
    slot: number;
    startsAt: Date;
    status: string;
  }[];
};

export async function getAppointment(id: string) {
  return prisma.appointment.findUnique({
    where: { id },
    include: { customer: true, pack: true, workout: true },
  });
}

export async function listScheduleCustomers(): Promise<ScheduleCustomer[]> {
  const rows = await prisma.customer.findMany({
    where: { status: "active" },
    include: {
      packs: { orderBy: { purchasedAt: "asc" } },
      appointments: { orderBy: { slot: "asc" } },
    },
    orderBy: { name: "asc" },
  });

  return rows.map((customer) => {
    const pack =
      customer.packs.find((item) => item.remaining > 0) ?? customer.packs[0];
    const open = customer.appointments.filter((item) => item.status === "unscheduled");
    const remaining = customer.packs.reduce((sum, item) => sum + item.remaining, 0);
    const scheduledAppointments = customer.appointments
      .filter(
        (item): item is typeof item & { startsAt: Date } =>
          item.status === "scheduled" && item.startsAt != null,
      )
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
      .map((item) => ({
        id: item.id,
        slot: item.slot,
        startsAt: item.startsAt,
        status: item.status,
      }));
    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      kondisi: customer.notes,
      program: pack?.program ?? "—",
      purchased: pack?.purchased ?? 0,
      used: pack?.used ?? 0,
      remaining,
      openSlots: open.length,
      nextSlot: open[0]?.slot ?? null,
      scheduledAppointments,
    };
  });
}

export async function getCalendarMonth(anchor: Date) {
  const from = startOfMonth(anchor);
  const to = endOfMonth(anchor);
  return prisma.appointment.findMany({
    where: {
      startsAt: { gte: from, lte: to },
      status: { in: ["scheduled", "completed"] },
    },
    include: { customer: true, pack: true },
    orderBy: { startsAt: "asc" },
  });
}

export async function listReminders() {
  return prisma.reminder.findMany({
    include: { customer: true, pack: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSettings() {
  return prisma.studioSettings.upsert({
    where: { id: "fortyfit" },
    update: {},
    create: { id: "fortyfit" },
  });
}
