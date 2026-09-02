import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/studio/empty-state";
import { CANCELLED_KIND, MOVED_KIND, noticeLabel } from "@/lib/scheduling";
import { formatDateTime } from "@/lib/time";

export type AppointmentHistoryRow = {
  id: string;
  kind: string;
  fromStartsAt: Date | string | null;
  toStartsAt: Date | string | null;
  hoursNotice: number | null;
  createdAt: Date | string;
};

function describe(row: AppointmentHistoryRow) {
  switch (row.kind) {
    case MOVED_KIND:
      return `Dipindah dari ${formatDateTime(row.fromStartsAt)} ke ${formatDateTime(row.toStartsAt)}`;
    case CANCELLED_KIND:
      return `Dibatalkan dari ${formatDateTime(row.fromStartsAt)}`;
    default:
      return row.kind;
  }
}

export function AppointmentHistory({ events }: { events: AppointmentHistoryRow[] }) {
  const moved = events.filter((item) => item.kind === MOVED_KIND).length;
  const cancelled = events.filter((item) => item.kind === CANCELLED_KIND).length;
  const shortNotice = events.filter(
    (item) => noticeLabel(item.hoursNotice) === "mendadak",
  ).length;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Riwayat batal & pindah</CardTitle>
        <CardDescription>
          {events.length === 0
            ? "Belum ada perubahan jadwal yang tercatat."
            : `${moved} kali pindah, ${cancelled} kali batal${
                shortNotice > 0 ? `, ${shortNotice} di antaranya mendadak` : ""
              }.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <EmptyState
            title="Masih bersih"
            description="Setiap kali sesi dipindah atau dibatalkan, catatannya muncul di sini."
          />
        ) : (
          <div className="space-y-2">
            {events.map((row) => {
              const notice = noticeLabel(row.hoursNotice);
              return (
                <div
                  key={row.id}
                  className="flex flex-col gap-1 rounded-xl border border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm">{describe(row)}</p>
                    <p className="text-xs text-muted-foreground">
                      Dicatat {formatDateTime(row.createdAt)}
                      {row.hoursNotice != null
                        ? ` · ${row.hoursNotice} jam sebelum sesi`
                        : ""}
                    </p>
                  </div>
                  {notice ? (
                    <Badge variant={notice === "mendadak" ? "destructive" : "secondary"}>
                      {notice}
                    </Badge>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
