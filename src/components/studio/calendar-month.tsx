import Link from "next/link";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { Appointment, Customer } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { dayKey, formatTime } from "@/lib/time";
import { cn } from "@/lib/utils";

type Item = Appointment & { customer: Customer };

export function CalendarMonth({
  month,
  items,
  basePath = "/admin/jadwal",
  eventBasePath = "/admin/jadwal",
}: {
  month: Date;
  items: Item[];
  basePath?: string;
  eventBasePath?: string;
}) {
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const byDay = new Map<string, Item[]>();
  for (const item of items) {
    if (!item.startsAt) continue;
    const key = dayKey(item.startsAt);
    byDay.set(key, [...(byDay.get(key) ?? []), item]);
  }

  const prev = format(addMonths(month, -1), "yyyy-MM");
  const next = format(addMonths(month, 1), "yyyy-MM");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-2xl capitalize">
          {format(month, "LLLL yyyy", { locale: localeId })}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href={`${basePath}?month=${prev}`} />}>
            Bulan lalu
          </Button>
          <Button variant="outline" render={<Link href={`${basePath}?month=${next}`} />}>
            Bulan depan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-border ring-1 ring-border">
        {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((label) => (
          <div
            key={label}
            className="bg-muted/60 px-2 py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
        {days.map((day) => {
          const key = dayKey(day);
          const events = byDay.get(key) ?? [];
          const inMonth = isSameMonth(day, month);
          return (
            <div
              key={key}
              className={cn(
                "min-h-28 bg-card p-2",
                !inMonth && "bg-muted/30 text-muted-foreground",
              )}
            >
              <p className="mb-1 text-xs font-medium">{format(day, "d")}</p>
              <div className="space-y-1">
                {events.map((event) => (
                  <Link
                    key={event.id}
                    href={`${eventBasePath}/${event.id}?month=${format(month, "yyyy-MM")}`}
                    className={cn(
                      "block rounded-md px-1.5 py-1 text-[11px] leading-4 hover:bg-primary/20",
                      event.status === "completed"
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/12 text-foreground",
                    )}
                  >
                    <span className="font-medium">{formatTime(event.startsAt)}</span>{" "}
                    {event.customer.name}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
