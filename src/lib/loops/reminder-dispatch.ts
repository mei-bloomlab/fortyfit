import { prisma } from "@/lib/db";
import { MAX_DISPATCH_ATTEMPTS } from "@/lib/engineering/rules";
import { runLoop, type LoopTick } from "@/lib/engineering/loop";
import {
  CUSTOMER_MANUAL_KIND,
  buildCustomerManualMessage,
  getWhatsAppAdapter,
} from "@/lib/openwa/adapter";

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
};

function destinationPhone(
  kind: string,
  customerPhone: string,
  adminPhone: string,
) {
  return kind === CUSTOMER_MANUAL_KIND ? customerPhone : adminPhone;
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
      customerName: item.customer.name,
      phone: destinationPhone(item.kind, item.customer.phone, settings.adminPhone),
      payload: item.payload,
      attempts: item.attempts,
    })),
  };
}

async function sendObserved(items: DispatchItem[]): Promise<DispatchAction> {
  const adapter = getWhatsAppAdapter();
  const sent: string[] = [];
  const failed: string[] = [];
  const exhausted: string[] = [];

  for (const item of items) {
    const result = await adapter.sendText(item.phone, item.payload);
    const attempts = item.attempts + 1;

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

  return { sent, failed, exhausted };
}

export async function dispatchPendingReminders(): Promise<DispatchAction> {
  const observation = await observePendingReminders();
  return sendObserved(observation.pending);
}

export async function dispatchReminderIds(ids: string[]): Promise<DispatchAction> {
  if (ids.length === 0) {
    return { sent: [], failed: [], exhausted: [] };
  }

  const observation = await observePendingReminders();
  const wanted = new Set(ids);
  return sendObserved(observation.pending.filter((item) => wanted.has(item.id)));
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
