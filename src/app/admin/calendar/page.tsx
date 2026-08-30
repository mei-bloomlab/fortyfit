import Link from "next/link";
import { format, parseISO } from "date-fns";
import { CalendarMonth } from "@/components/studio/calendar-month";
import { EmptyState } from "@/components/studio/empty-state";
import { PageHeader } from "@/components/studio/page-header";
import { getCalendarMonth } from "@/lib/queries";
import { formatTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const anchor = month ? parseISO(`${month}-01`) : new Date();
  const items = await getCalendarMonth(anchor);
  const monthKey = format(anchor, "yyyy-MM");

  return (
    <div>
      <PageHeader
        eyebrow="Kalender studio"
        title="Jam dan nama semua customer"
        description="Tampilan bulan untuk semua sesi. Atur jam baru lewat Atur Jadwal; klik sesi di sini untuk tandai selesai atau cancel."
      />

      <CalendarMonth month={anchor} items={items} basePath="/admin/calendar" />

      <div className="mt-8">
        <h2 className="mb-3 font-heading text-xl">Daftar sesi bulan ini</h2>
        {items.length === 0 ? (
          <EmptyState
            title="Kalender masih kosong"
            description="Setelah jadwal masuk dari Atur Jadwal atau halaman customer, ringkasan jam dan nama muncul di sini."
          />
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <p key={item.id} className="text-sm">
                <Link
                  href={`/admin/jadwal/${item.id}?month=${monthKey}`}
                  className="font-medium hover:underline"
                >
                  {formatTime(item.startsAt)} {item.customer.name}
                </Link>
                <span className="text-muted-foreground">
                  {" "}
                  · {item.location} · {item.status === "completed" ? "selesai" : "terjadwal"}
                </span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
