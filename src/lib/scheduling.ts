import { parseStudioDateTime } from "@/lib/time";

export const MOVED_KIND = "moved";
export const CANCELLED_KIND = "cancelled";

export const DEFAULT_DURATION_MIN = 60;

export type RescheduleTarget = { startsAt: Date; status: "scheduled" };

/**
 * A session may only be moved while it is still open. Completed sessions keep
 * their time because the pack was already deducted against it.
 */
export function rescheduleTarget(
  currentStatus: string,
  startsAtInput: string,
): RescheduleTarget | null {
  const trimmed = startsAtInput.trim();
  if (!trimmed) return null;
  if (currentStatus === "completed") return null;

  const startsAt = parseStudioDateTime(trimmed);
  if (Number.isNaN(startsAt.getTime())) return null;

  return { startsAt, status: "scheduled" };
}

/**
 * Whole hours of warning the studio got, counted from when the change was made
 * to when the session was originally due. Past-due sessions count as zero.
 */
export function hoursNotice(
  originalStartsAt: Date | string | null | undefined,
  now: Date,
): number | null {
  if (!originalStartsAt) return null;
  const from = new Date(originalStartsAt);
  if (Number.isNaN(from.getTime())) return null;
  const diffHours = (from.getTime() - now.getTime()) / 3_600_000;
  return Math.max(0, Math.floor(diffHours));
}

export type NoticeLabel = "mendadak" | "kurang dari sehari";

/** Only short notice is worth flagging; anything roomier needs no badge. */
export function noticeLabel(hours: number | null | undefined): NoticeLabel | null {
  if (hours == null) return null;
  if (hours < 6) return "mendadak";
  if (hours < 24) return "kurang dari sehari";
  return null;
}

export type BusySlot = {
  id: string;
  name: string;
  startsAt: string;
  durationMin?: number;
};

/**
 * Sessions that overlap the candidate time. This is a warning, not a block:
 * Semi Private Couple legitimately puts two people in the same slot.
 */
export function findClashes(
  startsAtInput: string,
  busy: BusySlot[],
  options: { ignoreId?: string; durationMin?: number } = {},
): BusySlot[] {
  const trimmed = startsAtInput.trim();
  if (!trimmed) return [];

  const start = parseStudioDateTime(trimmed);
  if (Number.isNaN(start.getTime())) return [];

  const durationMin = options.durationMin ?? DEFAULT_DURATION_MIN;
  const end = start.getTime() + durationMin * 60_000;

  return busy.filter((slot) => {
    if (slot.id === options.ignoreId) return false;
    const other = new Date(slot.startsAt);
    if (Number.isNaN(other.getTime())) return false;
    const otherEnd = other.getTime() + (slot.durationMin ?? durationMin) * 60_000;
    return other.getTime() < end && start.getTime() < otherEnd;
  });
}
