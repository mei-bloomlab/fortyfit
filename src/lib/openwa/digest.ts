import { DEFAULT_DIGEST_TIME, STUDIO_TIMEZONE } from "@/lib/engineering/rules";

export type DigestClock = {
  date: string;
  minutes: number;
};

export function parseClockTime(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function normalizeDigestTime(value: string | null | undefined): string {
  const parsed = parseClockTime(value ?? "");
  if (!parsed) return DEFAULT_DIGEST_TIME;
  return `${String(parsed.hour).padStart(2, "0")}:${String(parsed.minute).padStart(2, "0")}`;
}

export function zonedClock(now: Date, timeZone = STUDIO_TIMEZONE): DigestClock {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "0";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

export function formatDigestDateLabel(now: Date, timeZone = STUDIO_TIMEZONE): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(now);
}

export function isDigestDue(input: {
  now: Date;
  timeZone?: string;
  clockTime?: string;
  lastSentOn?: string | null;
}): boolean {
  const timeZone = input.timeZone || STUDIO_TIMEZONE;
  const clock = zonedClock(input.now, timeZone);
  if (input.lastSentOn === clock.date) return false;
  const parsed = parseClockTime(normalizeDigestTime(input.clockTime));
  const dueMinutes = (parsed?.hour ?? 9) * 60 + (parsed?.minute ?? 30);
  return clock.minutes >= dueMinutes;
}
