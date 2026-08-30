export const WIPE_CUSTOMERS_CONFIRM = "HAPUS SEMUA";

export const KIND_LABEL: Record<string, string> = {
  low_sessions: "Notif admin · sisa sesi",
  customer_manual: "Reminder customer (manual)",
  customer_thanks: "Ucapan terima kasih customer",
  morning_digest: "Ringkasan pagi admin",
};

export function reminderHeadline(item: {
  kind: string;
  customer?: { name: string } | null;
}): string {
  if (item.customer?.name) return item.customer.name;
  if (item.kind === "morning_digest") return "Ringkasan pagi admin";
  if (item.kind === "low_sessions") return "Notice admin";
  return "WhatsApp";
}

export const STATUS_LABEL: Record<string, string> = {
  lead: "Lead situs",
  active: "Aktif",
  paused: "Jeda",
  completed: "Selesai",
  scheduled: "Terjadwal",
  unscheduled: "Belum dijadwalkan",
  cancelled: "Batal",
  no_show: "Tidak datang",
  pending: "Menunggu",
  sent: "Terkirim",
  failed: "Gagal",
  skipped: "Dilewati",
};

export const STATUS_TONE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  lead: "outline",
  active: "default",
  scheduled: "secondary",
  unscheduled: "outline",
  pending: "secondary",
  sent: "outline",
  completed: "outline",
  failed: "destructive",
  cancelled: "destructive",
  no_show: "destructive",
  skipped: "outline",
  paused: "secondary",
};
