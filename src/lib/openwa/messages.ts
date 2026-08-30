export const ADMIN_NOTICE_KIND = "low_sessions";
export const CUSTOMER_MANUAL_KIND = "customer_manual";
export const CUSTOMER_THANKS_KIND = "customer_thanks";
export const MORNING_DIGEST_KIND = "morning_digest";

export const REMINDER_KINDS = [
  ADMIN_NOTICE_KIND,
  CUSTOMER_MANUAL_KIND,
  CUSTOMER_THANKS_KIND,
  MORNING_DIGEST_KIND,
] as const;

export type ReminderKind = (typeof REMINDER_KINDS)[number];

export function asReminderKind(kind: string): ReminderKind | "unknown" {
  switch (kind) {
    case ADMIN_NOTICE_KIND:
    case CUSTOMER_MANUAL_KIND:
    case CUSTOMER_THANKS_KIND:
    case MORNING_DIGEST_KIND:
      return kind;
    default:
      return "unknown";
  }
}

export function destinationForKind(
  kind: string,
  customerPhone: string,
  adminPhone: string,
): string {
  const resolved = asReminderKind(kind);
  switch (resolved) {
    case CUSTOMER_MANUAL_KIND:
    case CUSTOMER_THANKS_KIND:
      return customerPhone;
    case ADMIN_NOTICE_KIND:
    case MORNING_DIGEST_KIND:
    case "unknown":
      return adminPhone;
    default: {
      const _exhaustive: never = resolved;
      return _exhaustive;
    }
  }
}

export function reminderHeadline(input: {
  kind: string;
  customerName?: string | null;
}): string {
  if (input.customerName) return input.customerName;
  const kind = asReminderKind(input.kind);
  switch (kind) {
    case MORNING_DIGEST_KIND:
      return "Ringkasan pagi admin";
    case ADMIN_NOTICE_KIND:
      return "Notice admin";
    case CUSTOMER_MANUAL_KIND:
    case CUSTOMER_THANKS_KIND:
      return "WhatsApp customer";
    case "unknown":
      return "WhatsApp admin";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function buildLowSessionMessage(input: {
  name: string;
  phone: string;
  remaining: number;
  program: string;
}): string {
  return [
    `Notice FortyFit: ${input.name} (${input.phone})`,
    `sisa ${input.remaining} sesi ${input.program}.`,
    input.remaining === 0
      ? "Paket sudah habis. Follow-up perpanjang."
      : `Tinggal ${input.remaining}x lagi habis. Follow-up perpanjang.`,
  ].join(" ");
}

export function reminderCoversRemaining(payload: string, remaining: number) {
  return payload.includes(`sisa ${remaining} sesi`);
}

export function buildCustomerManualMessage(input: {
  name: string;
  remaining: number;
  program: string;
}): string {
  const sisa =
    input.remaining <= 0
      ? "Paket sesimu sudah habis."
      : `Sisa sesimu ${input.remaining} untuk program ${input.program}.`;
  return [
    `Hai ${input.name}, ini pengingat dari FortyFit Studio Tabanan.`,
    sisa,
    "Yuk datang latihan sesuai jadwal, atau kabari kami kalau perlu reschedule.",
  ].join(" ");
}

export type ThanksExercise = {
  name: string;
  sets?: string;
};

export function buildCustomerThanksMessage(input: {
  name: string;
  exercises: ThanksExercise[];
}): string {
  const lines = [
    `Hai ${input.name}, terima kasih sudah datang latihan di FortyFit Studio Tabanan.`,
  ];
  const named = input.exercises
    .map((item) => ({ name: item.name.trim(), sets: item.sets?.trim() }))
    .filter((item) => item.name.length > 0);

  if (named.length > 0) {
    lines.push("Gerakan yang kamu selesaikan hari ini:");
    for (const exercise of named) {
      lines.push(exercise.sets ? `• ${exercise.name} (${exercise.sets})` : `• ${exercise.name}`);
    }
  }

  lines.push("Sampai ketemu di sesi berikutnya.");
  return lines.join("\n");
}

export type DigestCustomer = {
  name: string;
  phone: string;
  program: string;
  remaining: number;
};

export function buildMorningDigestMessage(input: {
  dateLabel: string;
  threshold: number;
  customers: DigestCustomer[];
}): string {
  const header = `FortyFit — ringkasan sisa sesi ${input.dateLabel} (ambang ${input.threshold})`;
  if (input.customers.length === 0) {
    return [
      header,
      "",
      `Tidak ada customer aktif dengan sisa sesi ≤ ${input.threshold}.`,
    ].join("\n");
  }

  return [
    header,
    "",
    ...input.customers.map(
      (item) =>
        `• ${item.name} (${item.phone}) — ${item.program} — sisa ${item.remaining}`,
    ),
    "",
    "Follow-up perpanjang untuk nama di atas.",
  ].join("\n");
}
