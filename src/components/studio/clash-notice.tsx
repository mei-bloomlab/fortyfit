import type { BusySlot } from "@/lib/scheduling";
import { formatDateTime } from "@/lib/time";

/**
 * A warning, never a block: Semi Private Couple puts two people in one slot on
 * purpose, so the studio decides whether an overlap is real.
 */
export function ClashNotice({ clashes }: { clashes: BusySlot[] }) {
  if (clashes.length === 0) return null;

  const names = clashes
    .map((slot) => `${slot.name} (${formatDateTime(slot.startsAt)})`)
    .join(", ");

  return (
    <p className="rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive">
      {`Jam ini bentrok dengan ${names}. Tetap bisa dilanjut kalau memang sesi bareng.`}
    </p>
  );
}
