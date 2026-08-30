export function parseSessionCount(value: unknown, fallback = 4) {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), 60);
}

export function sessionSlotRows(
  customerId: string,
  packId: string,
  count: number,
) {
  const safeCount = parseSessionCount(count, 0);
  return Array.from({ length: safeCount }, (_, index) => ({
    customerId,
    packId,
    slot: index + 1,
    startsAt: null,
    status: "unscheduled",
    location: "Studio Tabanan",
  }));
}
