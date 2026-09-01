export const ADMIN_NOTICE_KIND = "low_sessions";
export const ADMIN_MANUAL_KIND = "admin_manual";
export const CUSTOMER_THANKS_KIND = "customer_thanks";
export const MORNING_DIGEST_KIND = "morning_digest";

export const REMINDER_KINDS = [
  ADMIN_NOTICE_KIND,
  ADMIN_MANUAL_KIND,
  CUSTOMER_THANKS_KIND,
  MORNING_DIGEST_KIND,
] as const;

export type ReminderKind = (typeof REMINDER_KINDS)[number];

export const DEFAULT_ADMIN_NOTICE_TEMPLATE =
  "Notice FortyFit: {nama} ({telepon}) sisa {sisa} sesi {program}. {tindak}";

export const DEFAULT_ADMIN_MANUAL_TEMPLATE =
  "Cek sisa sesi FortyFit: {nama} ({telepon}) {sisa_kalimat} Hubungi dia untuk memastikan jadwal latihan berikutnya.";

export const DEFAULT_CUSTOMER_THANKS_TEMPLATE = [
  "Hai {nama}, terima kasih sudah datang latihan di FortyFit Studio Tabanan.",
  "{gerakan}",
  "Sampai ketemu di sesi berikutnya.",
].join("\n");

export const DEFAULT_MORNING_DIGEST_TEMPLATE = [
  "FortyFit — ringkasan sisa sesi {tanggal} (ambang {ambang})",
  "",
  "{daftar}",
].join("\n");

const PLACEHOLDER_RE = /\{([a-z0-9_]+)\}/gi;

export function asReminderKind(kind: string): ReminderKind | "unknown" {
  switch (kind) {
    case ADMIN_NOTICE_KIND:
    case ADMIN_MANUAL_KIND:
    case CUSTOMER_THANKS_KIND:
    case MORNING_DIGEST_KIND:
      return kind;
    default:
      return "unknown";
  }
}

/**
 * The recap after a finished session is the only message a customer receives.
 * Everything about session balance goes to the studio admin.
 */
export function destinationForKind(
  kind: string,
  customerPhone: string,
  adminPhone: string,
): string {
  const resolved = asReminderKind(kind);
  switch (resolved) {
    case CUSTOMER_THANKS_KIND:
      return customerPhone;
    case ADMIN_NOTICE_KIND:
    case ADMIN_MANUAL_KIND:
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
    case ADMIN_MANUAL_KIND:
      return "Notice admin";
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

export function applyTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  const lines = template.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const onlyPlaceholder = /^\{([a-z0-9_]+)\}$/i.exec(trimmed);
    if (onlyPlaceholder) {
      const key = onlyPlaceholder[1].toLowerCase();
      const value = Object.hasOwn(vars, key) ? vars[key] : onlyPlaceholder[0];
      if (value === "") continue;
      out.push(value);
      continue;
    }
    out.push(fillPlaceholders(line, vars));
  }
  return out.join("\n");
}

export function normalizeStoredTemplate(value: string, fallback: string): string {
  const trimmed = value.replace(/\r\n/g, "\n").trim();
  return trimmed === fallback.replace(/\r\n/g, "\n").trim() ? "" : trimmed;
}

export function templateOrDefault(saved: string | null | undefined, fallback: string): string {
  const trimmed = saved?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : fallback;
}

function fillPlaceholders(line: string, vars: Record<string, string>): string {
  return line.replace(PLACEHOLDER_RE, (match, key: string) => {
    const normalized = key.toLowerCase();
    return Object.hasOwn(vars, normalized) ? vars[normalized] : match;
  });
}

function followUpSentence(remaining: number): string {
  return remaining === 0
    ? "Paket sudah habis. Follow-up perpanjang."
    : `Tinggal ${remaining}x lagi habis. Follow-up perpanjang.`;
}

function remainingClause(remaining: number, program: string): string {
  return remaining <= 0
    ? `paket ${program} sudah habis.`
    : `sisa ${remaining} sesi program ${program}.`;
}

export function buildLowSessionMessage(input: {
  name: string;
  phone: string;
  remaining: number;
  program: string;
  template?: string | null;
}): string {
  const hardcoded = [
    `Notice FortyFit: ${input.name} (${input.phone})`,
    `sisa ${input.remaining} sesi ${input.program}.`,
    followUpSentence(input.remaining),
  ].join(" ");
  const template = normalizeStoredTemplate(input.template ?? "", DEFAULT_ADMIN_NOTICE_TEMPLATE);
  if (!template) return hardcoded;
  return applyTemplate(template, {
    nama: input.name || "customer",
    telepon: input.phone,
    sisa: String(input.remaining),
    program: input.program || "FortyFit",
    tindak: followUpSentence(input.remaining),
  });
}

export function reminderCoversRemaining(payload: string, remaining: number) {
  return payload.includes(`sisa ${remaining} sesi`);
}

export function buildAdminManualMessage(input: {
  name: string;
  remaining: number;
  program: string;
  phone?: string;
  template?: string | null;
}): string {
  const program = input.program || "FortyFit";
  const sisa = remainingClause(input.remaining, program);
  const hardcoded = [
    `Cek sisa sesi FortyFit: ${input.name} (${input.phone || "nomor belum diisi"})`,
    sisa,
    "Hubungi dia untuk memastikan jadwal latihan berikutnya.",
  ].join(" ");
  const template = normalizeStoredTemplate(input.template ?? "", DEFAULT_ADMIN_MANUAL_TEMPLATE);
  if (!template) return hardcoded;
  return applyTemplate(template, {
    nama: input.name || "customer",
    telepon: input.phone || "",
    sisa: String(input.remaining),
    program,
    sisa_kalimat: sisa,
  });
}

export type ThanksExercise = {
  name: string;
  sets?: string;
};

export function formatExerciseList(exercises: ThanksExercise[]): string {
  const named = exercises
    .map((item) => ({ name: item.name.trim(), sets: item.sets?.trim() }))
    .filter((item) => item.name.length > 0);
  if (named.length === 0) return "";
  return [
    "Gerakan yang kamu selesaikan hari ini:",
    ...named.map((exercise) =>
      exercise.sets ? `• ${exercise.name} (${exercise.sets})` : `• ${exercise.name}`,
    ),
  ].join("\n");
}

export function buildCustomerThanksMessage(input: {
  name: string;
  exercises: ThanksExercise[];
  phone?: string;
  template?: string | null;
}): string {
  const gerakan = formatExerciseList(input.exercises);
  const lines = [
    `Hai ${input.name}, terima kasih sudah datang latihan di FortyFit Studio Tabanan.`,
  ];
  if (gerakan) lines.push(gerakan);
  lines.push("Sampai ketemu di sesi berikutnya.");
  const hardcoded = lines.join("\n");
  const template = normalizeStoredTemplate(input.template ?? "", DEFAULT_CUSTOMER_THANKS_TEMPLATE);
  if (!template) return hardcoded;
  return applyTemplate(template, {
    nama: input.name || "customer",
    telepon: input.phone || "",
    gerakan,
  });
}

export type DigestCustomer = {
  name: string;
  phone: string;
  program: string;
  remaining: number;
};

export function formatDigestList(
  threshold: number,
  customers: DigestCustomer[],
): string {
  if (customers.length === 0) {
    return `Tidak ada customer aktif dengan sisa sesi ≤ ${threshold}.`;
  }
  return [
    ...customers.map(
      (item) =>
        `• ${item.name} (${item.phone}) — ${item.program} — sisa ${item.remaining}`,
    ),
    "",
    "Follow-up perpanjang untuk nama di atas.",
  ].join("\n");
}

export function buildMorningDigestMessage(input: {
  dateLabel: string;
  threshold: number;
  customers: DigestCustomer[];
  template?: string | null;
}): string {
  const header = `FortyFit — ringkasan sisa sesi ${input.dateLabel} (ambang ${input.threshold})`;
  const daftar = formatDigestList(input.threshold, input.customers);
  const hardcoded = [header, "", daftar].join("\n");
  const template = normalizeStoredTemplate(input.template ?? "", DEFAULT_MORNING_DIGEST_TEMPLATE);
  if (!template) return hardcoded;
  return applyTemplate(template, {
    tanggal: input.dateLabel,
    ambang: String(input.threshold),
    daftar,
  });
}
