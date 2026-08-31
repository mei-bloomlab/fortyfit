import { addDays } from "date-fns";
import { STUDIO_TIMEZONE } from "@/lib/engineering/rules";

export { STUDIO_TIMEZONE };

/** Asia/Makassar is UTC+8 year-round (no DST). */
const STUDIO_OFFSET = "+08:00";

/** `datetime-local` values: `YYYY-MM-DDTHH:mm` or with seconds. */
const DATETIME_LOCAL = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?$/;

export function studioNow(): Date {
  return new Date();
}

/**
 * Parse a datetime-local string as Asia/Makassar wall clock.
 * ISO strings that already have an offset or `Z` stay absolute instants.
 */
export function parseStudioDateTime(value: string): Date {
  const trimmed = value.trim();
  const match = DATETIME_LOCAL.exec(trimmed);
  if (match) {
    const seconds = match[3] ?? "00";
    return new Date(`${match[1]}T${match[2]}:${seconds}${STUDIO_OFFSET}`);
  }
  return new Date(trimmed);
}

function toDate(value: Date | string): Date {
  return typeof value === "string" ? parseStudioDateTime(value) : value;
}

function pad2(value: string): string {
  return value.padStart(2, "0");
}

function studioClock(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STUDIO_TIMEZONE,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const hour = get("hour") === "24" ? "00" : pad2(get("hour"));
  return {
    weekday: get("weekday"),
    year: get("year"),
    month: pad2(get("month")),
    day: pad2(get("day")),
    hour,
    minute: pad2(get("minute")),
  };
}

function studioMonthShort(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STUDIO_TIMEZONE,
    month: "short",
  }).formatToParts(value);
  return parts.find((part) => part.type === "month")?.value ?? "";
}

export function formatDate(value: Date | string, pattern = "d MMM yyyy"): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  const clock = studioClock(date);
  if (pattern === "yyyy-MM-dd") {
    return `${clock.year}-${clock.month}-${clock.day}`;
  }
  return `${Number(clock.day)} ${studioMonthShort(date)} ${clock.year}`;
}

export function formatTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  const clock = studioClock(date);
  return `${clock.hour}:${clock.minute}`;
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "Belum dijadwalkan";
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "Belum dijadwalkan";
  const clock = studioClock(date);
  return `${clock.weekday} ${Number(clock.day)} ${studioMonthShort(date)}, ${clock.hour}:${clock.minute}`;
}

export function toLocalInputValue(value: Date | string): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "";
  const clock = studioClock(date);
  return `${clock.year}-${clock.month}-${clock.day}T${clock.hour}:${clock.minute}`;
}

export function dayKey(value: Date | string): string {
  const date = toDate(value);
  const clock = studioClock(date);
  return `${clock.year}-${clock.month}-${clock.day}`;
}

export function startOfStudioDay(value = studioNow()): Date {
  return parseStudioDateTime(`${dayKey(value)}T00:00`);
}

export function rangeDays(from: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, index) => addDays(from, index));
}
