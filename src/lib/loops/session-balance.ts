import { prisma } from "@/lib/db";
import { DEFAULT_THRESHOLD } from "@/lib/engineering/rules";
import { runLoop, type LoopTick } from "@/lib/engineering/loop";
import {
  ADMIN_NOTICE_KIND,
  buildLowSessionMessage,
  reminderCoversRemaining,
} from "@/lib/openwa/adapter";

export type LowPack = {
  packId: string;
  customerId: string;
  customerName: string;
  phone: string;
  program: string;
  remaining: number;
  alreadyQueued: boolean;
};

export type BalanceObservation = {
  threshold: number;
  lowPacks: LowPack[];
};

function alreadyQueuedAtRemaining(
  reminders: { payload: string }[],
  remaining: number,
) {
  return reminders.some((item) => reminderCoversRemaining(item.payload, remaining));
}

export async function observeSessionBalance(
  threshold = DEFAULT_THRESHOLD,
): Promise<BalanceObservation> {
  const packs = await prisma.sessionPack.findMany({
    where: {
      remaining: { lte: threshold },
      customer: { status: "active" },
    },
    include: {
      customer: true,
      reminders: {
        where: { kind: ADMIN_NOTICE_KIND, status: { in: ["pending", "sent"] } },
      },
    },
    orderBy: { remaining: "asc" },
  });

  return {
    threshold,
    lowPacks: packs.map((pack) => ({
      packId: pack.id,
      customerId: pack.customerId,
      customerName: pack.customer.name,
      phone: pack.customer.phone,
      program: pack.program,
      remaining: pack.remaining,
      alreadyQueued: alreadyQueuedAtRemaining(pack.reminders, pack.remaining),
    })),
  };
}

export async function enqueueLowSessionReminders(
  observation?: BalanceObservation,
): Promise<{ createdIds: string[]; skipped: number }> {
  const snapshot = observation ?? (await observeSessionBalance());
  const createdIds: string[] = [];
  let skipped = 0;

  for (const pack of snapshot.lowPacks) {
    if (pack.alreadyQueued) {
      skipped += 1;
      continue;
    }

    const reminder = await prisma.reminder.create({
      data: {
        customerId: pack.customerId,
        packId: pack.packId,
        kind: ADMIN_NOTICE_KIND,
        payload: buildLowSessionMessage({
          name: pack.customerName,
          phone: pack.phone,
          remaining: pack.remaining,
          program: pack.program,
        }),
      },
    });
    createdIds.push(reminder.id);
  }

  return { createdIds, skipped };
}

export async function notifyAdminOnRemainingDrop(packId: string): Promise<{
  createdId?: string;
  skipped: boolean;
  reason: string;
}> {
  const settings = await prisma.studioSettings.upsert({
    where: { id: "fortyfit" },
    update: {},
    create: { id: "fortyfit", reminderThreshold: DEFAULT_THRESHOLD },
  });

  if (!settings.autoNotifyAdmin) {
    return { skipped: true, reason: "Kirim otomatis ke WA admin sedang mati" };
  }

  const pack = await prisma.sessionPack.findUnique({
    where: { id: packId },
    include: {
      customer: true,
      reminders: {
        where: { kind: ADMIN_NOTICE_KIND, status: { in: ["pending", "sent"] } },
      },
    },
  });

  if (!pack || pack.customer.status !== "active") {
    return { skipped: true, reason: "Paket atau customer tidak aktif" };
  }
  if (pack.remaining > settings.reminderThreshold) {
    return { skipped: true, reason: "Sisa sesi masih di atas ambang" };
  }
  if (alreadyQueuedAtRemaining(pack.reminders, pack.remaining)) {
    return { skipped: true, reason: "Notif admin untuk sisa ini sudah ada" };
  }

  const reminder = await prisma.reminder.create({
    data: {
      customerId: pack.customerId,
      packId: pack.id,
      kind: ADMIN_NOTICE_KIND,
      payload: buildLowSessionMessage({
        name: pack.customer.name,
        phone: pack.customer.phone,
        remaining: pack.remaining,
        program: pack.program,
      }),
    },
  });

  return { createdId: reminder.id, skipped: false, reason: "Notif admin masuk antrian" };
}

export async function runSessionBalanceLoop(
  threshold = DEFAULT_THRESHOLD,
): Promise<LoopTick<BalanceObservation, { createdIds: string[]; skipped: number }>[]> {
  return runLoop({
    name: "session_balance",
    maxAttempts: 1,
    observe: () => observeSessionBalance(threshold),
    decide: (obs) => {
      const fresh = obs.lowPacks.filter((pack) => !pack.alreadyQueued);
      if (fresh.length === 0) {
        return {
          kind: "stop",
          reason:
            obs.lowPacks.length === 0
              ? "Semua paket di atas ambang sisa sesi"
              : "Reminder sisa sesi sudah ada di antrian",
        };
      }
      return { kind: "act", action: "enqueue", payload: obs };
    },
    act: (payload) => enqueueLowSessionReminders(payload),
    verify: (_obs, act) => ({
      ok: true,
      reason: `Antrian baru ${act.createdIds.length}, dilewati ${act.skipped}`,
      route: act.createdIds.length > 0 ? "enqueue_reminder" : "END",
    }),
  });
}
