import { addDays, format, startOfDay } from "date-fns";
import { STUDIO_TIMEZONE } from "@/lib/engineering/rules";

export { STUDIO_TIMEZONE };

export function studioNow(): Date {
  return new Date();
}

export function formatDate(value: Date | string, pattern = "d MMM yyyy"): string {
  return format(typeof value === "string" ? new Date(value) : value, pattern);
}

export function formatTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return format(typeof value === "string" ? new Date(value) : value, "HH:mm");
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "Belum dijadwalkan";
  return format(typeof value === "string" ? new Date(value) : value, "EEE d MMM, HH:mm");
}

export function toLocalInputValue(value: Date): string {
  return format(value, "yyyy-MM-dd'T'HH:mm");
}

export function dayKey(value: Date | string): string {
  return format(typeof value === "string" ? new Date(value) : value, "yyyy-MM-dd");
}

export function startOfStudioDay(value = studioNow()): Date {
  return startOfDay(value);
}

export function rangeDays(from: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, index) => addDays(from, index));
}
