import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AppointmentActions } from "@/components/studio/appointment-actions";
import { EmptyState } from "@/components/studio/empty-state";
import { PageHeader } from "@/components/studio/page-header";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/labels";
import { workoutLinesFromJson } from "@/lib/loops/workout-log";
import { getAppointment, listExercises } from "@/lib/queries";
import { formatDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function AppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ appointmentId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { appointmentId } = await params;
  const { month } = await searchParams;
  const [appointment, exercises] = await Promise.all([
    getAppointment(appointmentId),
    listExercises(),
  ]);
  if (!appointment) notFound();

  const calendarHref = month ? `/admin/jadwal?month=${month}` : "/admin/jadwal";
  const remaining = appointment.pack?.remaining ?? 0;
  const canAct = appointment.status === "scheduled";

  return (
    <div>
      <PageHeader
        eyebrow="Sesi"
        title={appointment.customer.name}
        description="Isi latihan, Simpan tanpa potong paket, atau Selesai untuk potong sisa sesi. Cancel mengembalikan slot tanpa potong paket."
        actions={
          <Button variant="outline" render={<Link href={calendarHref} />}>
            Kembali ke kalender
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Detail sesi</CardTitle>
          <CardDescription>
            Sesi {appointment.slot}
            {appointment.pack ? ` · ${appointment.pack.program}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant={STATUS_TONE[appointment.status] ?? "outline"}>
              {STATUS_LABEL[appointment.status] ?? appointment.status}
            </Badge>
            <Badge variant={remaining <= 2 ? "destructive" : "secondary"}>
              sisa {remaining} sesi
            </Badge>
          </div>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Waktu · </span>
              {formatDateTime(appointment.startsAt)}
            </p>
            <p>
              <span className="text-muted-foreground">Lokasi · </span>
              {appointment.location}
            </p>
            {appointment.pack ? (
              <p>
                <span className="text-muted-foreground">Program · </span>
                {appointment.pack.program}
              </p>
            ) : null}
          </div>

          {canAct ? (
            <AppointmentActions
              appointmentId={appointment.id}
              customerId={appointment.customerId}
              customerName={appointment.customer.name}
              redirectTo={calendarHref}
              exercises={exercises}
              initialLines={workoutLinesFromJson(appointment.workout?.exercisesJson)}
            />
          ) : appointment.status === "completed" ? (
            <EmptyState
              title="Sesi sudah selesai"
              description="Sesi ini sudah dipotong dari paket. Cancel tidak mengembalikan sisa sesi."
            />
          ) : (
            <EmptyState
              title="Belum dijadwalkan"
              description="Slot ini kosong lagi. Isi jam dari Atur Jadwal atau halaman customer."
            />
          )}

          <Button
            variant="ghost"
            render={<Link href={`/admin/customers/${appointment.customerId}`} />}
          >
            Buka detail customer
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
