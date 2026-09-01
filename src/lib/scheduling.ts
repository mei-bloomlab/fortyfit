import { parseStudioDateTime } from "@/lib/time";

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
