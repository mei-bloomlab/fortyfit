import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CancelAppointmentButton } from "@/components/studio/appointment-actions";
import { StartSessionPanel } from "@/components/studio/session-workout-form";
import { EmptyState } from "@/components/studio/empty-state";
import { PageHeader } from "@/components/studio/page-header";
import { scanAndDispatchAction } from "@/lib/actions";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/labels";
import { workoutLinesFromJson } from "@/lib/loops/workout-log";
import { getDashboardData, listExercises } from "@/lib/queries";
import { formatTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [data, exercises] = await Promise.all([getDashboardData(), listExercises()]);

  return (
    <div>
      <PageHeader
        eyebrow="Studio Tabanan"
        title="Hari ini di FortyFit"
        description="Lihat siapa yang datang hari ini dan siapa yang sisa sesinya menipis."
        actions={
          <form action={scanAndDispatchAction}>
            <Button type="submit" variant="outline">
              Scan / kirim ulang antrian admin
            </Button>
          </form>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Customer aktif" value={String(data.customers)} />
        <Stat label="Sesi hari ini" value={String(data.todayAppointments.length)} />
        <Stat
          label={`Sisa ≤ ${data.threshold} sesi`}
          value={String(data.lowPacks.length)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Jadwal hari ini</CardTitle>
            <CardDescription>Ringkasan jam dan nama, siap dibuka ke progress.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.todayAppointments.length === 0 ? (
              <div className="space-y-3">
                <EmptyState
                  title="Belum ada sesi hari ini"
                  description="Buka Atur Jadwal di menu kiri: pilih customer, atau pilih jam dulu."
                />
                <Button variant="outline" render={<Link href="/admin/jadwal" />}>
                  Atur jadwal
                </Button>
              </div>
            ) : (
              data.todayAppointments.map((item) => {
                const lines = workoutLinesFromJson(item.workout?.exercisesJson);
                return (
                  <div
                    key={item.id}
                    className="space-y-3 rounded-xl border border-border/70 p-3"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium">
                          {formatTime(item.startsAt)} · {item.customer.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item.pack?.program ?? "Tanpa paket"} · sisa{" "}
                          {item.pack?.remaining ?? "—"} sesi · {item.location}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={STATUS_TONE[item.status] ?? "outline"}>
                          {STATUS_LABEL[item.status] ?? item.status}
                        </Badge>
                        {item.status === "scheduled" ? (
                          <CancelAppointmentButton
                            appointmentId={item.id}
                            redirectTo="/admin"
                            size="sm"
                          />
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            render={<Link href={`/admin/customers/${item.customerId}`} />}
                          >
                            Lihat progress
                          </Button>
                        )}
                      </div>
                    </div>
                    {item.status === "scheduled" ? (
                      <StartSessionPanel
                        appointmentId={item.id}
                        customerId={item.customerId}
                        customerName={item.customer.name}
                        redirectTo="/admin"
                        exercises={exercises}
                        initialLines={lines}
                      />
                    ) : null}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sisa sesi menipis</CardTitle>
              <CardDescription>
                Ambang {data.threshold} sesi. Ubah ambang dan nomor WA di Setting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.lowPacks.length === 0 ? (
                <EmptyState
                  title="Semua paket masih aman"
                  description="Client di sini muncul kalau sisa sesinya sudah masuk ambang."
                />
              ) : (
                data.lowPacks.map((pack) => (
                  <Link
                    key={pack.id}
                    href={`/admin/customers/${pack.customerId}`}
                    className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2 hover:bg-muted/40"
                  >
                    <span>
                      <span className="block font-medium">{pack.customer.name}</span>
                      <span className="text-xs text-muted-foreground">{pack.program}</span>
                    </span>
                    <Badge variant={pack.remaining === 0 ? "destructive" : "secondary"}>
                      sisa {pack.remaining}
                    </Badge>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notice ke admin</CardTitle>
              <CardDescription>
                Antrian notice yang tertahan. Atur ambang dan WA admin di Setting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.pendingReminders.length === 0 ? (
                <EmptyState
                  title="Tidak ada antrian tertahan"
                  description="Kalau ada notice yang gagal atau masih pending, daftarnya muncul di sini."
                />
              ) : (
                data.pendingReminders.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border/70 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{item.customer.name}</p>
                      <Badge variant={STATUS_TONE[item.status] ?? "outline"}>
                        {STATUS_LABEL[item.status] ?? item.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.payload}</p>
                  </div>
                ))
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" render={<Link href="/admin/reminders" />}>
                  Buka antrian lengkap
                </Button>
                <Button variant="ghost" render={<Link href="/admin/setting" />}>
                  Setting notif
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="font-heading text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
