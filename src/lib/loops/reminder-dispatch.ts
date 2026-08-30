import { prisma } from "@/lib/db";
import { MAX_DISPATCH_ATTEMPTS } from "@/lib/engineering/rules";
import { runLoop, type LoopTick } from "@/lib/engineering/loop";
import {
  getSidecarWhatsAppAdapter,
  getWhatsAppAdapter,
  shouldCountDispatchAttempt,
  type WhatsAppAdapter,
} from "@/lib/openwa/adapter";
import {
  CUSTOMER_MANUAL_KIND,
  buildCustomerManualMessage,
  destinationForKind,
} from "@/lib/openwa/messages";

export type DispatchItem = {
  id: string;
  kind: string;
  customerName: string;
  phone: string;
  payload: string;
  attempts: number;
};

export type DispatchObservation = {
  pending: DispatchItem[];
};

export type DispatchAction = {
  sent: string[];
  failed: string[];
  exhausted: string[];
  deferred: string[];
};

function emptyDispatch(): DispatchAction {
  return { sent: [], failed: [], exhausted: [], deferred: [] };
}

export async function observePendingReminders(): Promise<DispatchObservation> {
  const [pending, settings] = await Promise.all([
    prisma.reminder.findMany({
      where: { status: "pending" },
      include: { customer: true },
      orderBy: { createdAt: "asc" },
      take: 20,
    }),
    prisma.studioSettings.upsert({
      where: { id: "fortyfit" },
      update: {},
      create: { id: "fortyfit" },
    }),
  ]);

  return {
    pending: pending.map((item) => ({
      id: item.id,
      kind: item.kind,
      customerName: item.customer?.name ?? "Admin",
      phone: destinationForKind(
        item.kind,
        item.customer?.phone ?? "",
        settings.adminPhone,
      ),
      payload: item.payload,
      attempts: item.attempts,
    })),
  };
}

async function sendObserved(
  items: DispatchItem[],
  adapter: WhatsAppAdapter,
): Promise<DispatchAction> {
  const sent: string[] = [];
  const failed: string[] = [];
  const exhausted: string[] = [];
  const deferred: string[] = [];

  if (items.length === 0) return emptyDispatch();

  const status = await adapter.status();
  if (!status.ready) {
    for (const item of items) {
      await prisma.reminder.update({
        where: { id: item.id },
        data: { lastError: status.detail },
      });
      deferred.push(item.id);
    }
    return { sent, failed, exhausted, deferred };
  }

  for (const item of items) {
    const result = await adapter.sendText(item.phone, item.payload);
    const countAttempt = shouldCountDispatchAttempt({
      sidecarReady: status.ready,
      sendOk: result.ok,
      error: result.error,
    });
    const attempts = item.attempts + (countAttempt ? 1 : 0);

    if (result.ok) {
      await prisma.reminder.update({
        where: { id: item.id },
        data: {
          status: "sent",
          attempts,
          sentAt: new Date(),
          lastError: null,
        },
      });
      sent.push(item.id);
      continue;
    }

    if (!countAttempt) {
      await prisma.reminder.update({
        where: { id: item.id },
        data: { lastError: result.error ?? status.detail },
      });
      deferred.push(item.id);
      continue;
    }

    const nextStatus = attempts >= MAX_DISPATCH_ATTEMPTS ? "failed" : "pending";
    await prisma.reminder.update({
      where: { id: item.id },
      data: {
        status: nextStatus,
        attempts,
        lastError: result.error ?? "Kirim WhatsApp gagal",
      },
    });

    if (nextStatus === "failed") exhausted.push(item.id);
    else failed.push(item.id);
  }

  return { sent, failed, exhausted, deferred };
}

export async function dispatchPendingReminders(
  adapter: WhatsAppAdapter = getWhatsAppAdapter(),
): Promise<DispatchAction> {
  const observation = await observePendingReminders();
  return sendObserved(observation.pending, adapter);
}

export async function dispatchPendingRemindersFromSidecar(): Promise<DispatchAction> {
  return dispatchPendingReminders(getSidecarWhatsAppAdapter());
}

export async function dispatchReminderIds(
  ids: string[],
  adapter: WhatsAppAdapter = getWhatsAppAdapter(),
): Promise<DispatchAction> {
  if (ids.length === 0) return emptyDispatch();

  const observation = await observePendingReminders();
  const wanted = new Set(ids);
  return sendObserved(
    observation.pending.filter((item) => wanted.has(item.id)),
    adapter,
  );
}

export async function runReminderDispatchLoop(): Promise<
  LoopTick<DispatchObservation, DispatchAction>[]
> {
  return runLoop({
    name: "reminder_dispatch",
    maxAttempts: 1,
    observe: observePendingReminders,
    decide: (obs) => {
      if (obs.pending.length === 0) {
        return { kind: "stop", reason: "Tidak ada reminder pending" };
      }
      return { kind: "act", action: "dispatch", payload: obs };
    },
    act: () => dispatchPendingReminders(),
    verify: (_obs, act) => {
      if (act.exhausted.length > 0) {
        return {
          ok: false,
          reason: `${act.exhausted.length} reminder butuh review coach`,
          route: "human_review",
        };
      }
      if (act.failed.length > 0) {
        return {
          ok: false,
          reason: `${act.failed.length} gagal, masih bisa diulang`,
          route: "retry",
        };
      }
      if (act.deferred.length > 0 && act.sent.length === 0) {
        return {
          ok: true,
          reason: `${act.deferred.length} tetap pending sampai laptop OpenWA nyala`,
          route: "idle",
        };
      }
      return {
        ok: true,
        reason: act.sent.length > 0 ? `Terkirim ${act.sent.length}` : "Antrian kosong",
        route: act.sent.length > 0 ? "sent" : "idle",
      };
    },
  });
}

export async function enqueueCustomerManualReminder(customerId: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { packs: { orderBy: { purchasedAt: "desc" }, take: 1 } },
  });
  if (!customer) return null;

  const pack = customer.packs[0];
  const reminder = await prisma.reminder.create({
    data: {
      customerId: customer.id,
      packId: pack?.id,
      kind: CUSTOMER_MANUAL_KIND,
      channel: "whatsapp",
      payload: buildCustomerManualMessage({
        name: customer.name,
        remaining: pack?.remaining ?? 0,
        program: pack?.program ?? "FortyFit",
      }),
    },
  });

  const dispatch = await dispatchReminderIds([reminder.id]);
  return { reminder, dispatch };
}

export async function retryFailedReminder(id: string) {
  await prisma.reminder.update({
    where: { id },
    data: { status: "pending", lastError: null },
  });
}

export async function skipReminder(id: string) {
  await prisma.reminder.update({
    where: { id },
    data: { status: "skipped" },
  });
}
