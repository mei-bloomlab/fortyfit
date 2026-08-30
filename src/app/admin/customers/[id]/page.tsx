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
import { CancelAppointmentButton } from "@/components/studio/appointment-actions";
import {
  AddPackDialog,
  CompleteSessionDialog,
  CustomerProfileForm,
  SessionSlotForm,
} from "@/components/studio/customer-forms";
import { SendCustomerReminderButton } from "@/components/studio/send-customer-reminder-button";
import { EmptyState } from "@/components/studio/empty-state";
import { PageHeader } from "@/components/studio/page-header";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/labels";
import { getCustomer, listExercises, listPackages } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [customer, packages, exercises] = await Promise.all([
    getCustomer(id),
    listPackages(),
    listExercises(),
  ]);
  if (!customer) notFound();

  const pack = customer.packs[0];

  return (
    <div>
      <PageHeader
        eyebrow="Detail customer"
        title={customer.name}
        description="Data client dan slot sesi. Isi tanggal plus jam per sesi, atau buka Atur Jadwal."
        actions={
          <>
            <SendCustomerReminderButton customerId={customer.id} />
            <Button variant="outline" render={<Link href={`/admin/jadwal?customer=${customer.id}`} />}>
              Atur jadwal
            </Button>
          </>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Data customer</CardTitle>
          <CardDescription>Nama, WA, program, jumlah sesi, dan kondisi.</CardDescription>
        </CardHeader>
        <CardContent>
          {pack ? (
            <CustomerProfileForm
              customerId={customer.id}
              name={customer.name}
              phone={customer.phone}
              program={pack.program}
              purchased={pack.purchased}
              kondisi={customer.notes ?? ""}
              packages={packages}
            />
          ) : (
            <EmptyState
              title="Belum ada paket"
              description="Beli paket dulu supaya jumlah sesi dan slot jadwal muncul."
            />
          )}
        </CardContent>
      </Card>

      {customer.packs.map((item) => {
        const slots = customer.appointments
          .filter((row) => row.packId === item.id)
          .slice()
          .sort((a, b) => a.slot - b.slot);
        return (
          <Card key={item.id} className="mb-6">
            <CardHeader>
              <CardTitle>
                {item.program} · {item.purchased} sesi
              </CardTitle>
              <CardDescription>
                Sesi 1 sampai {item.purchased}. Kosongkan tanggal kalau belum dijadwalkan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {slots.length === 0 ? (
                <EmptyState
                  title="Slot sesi belum ada"
                  description="Paket ini belum punya slot."
                />
              ) : (
                slots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex flex-col gap-2 rounded-xl border border-border/70 p-3 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <SessionSlotForm
                      appointmentId={slot.id}
                      customerId={customer.id}
                      slot={slot.slot}
                      startsAt={slot.startsAt}
                    />
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <Badge variant={STATUS_TONE[slot.status] ?? "outline"}>
                        {STATUS_LABEL[slot.status] ?? slot.status}
                      </Badge>
                      {slot.status === "scheduled" ? (
                        <>
                          <CompleteSessionDialog
                            appointmentId={slot.id}
                            customerId={customer.id}
                            customerName={customer.name}
                            redirectTo={`/admin/customers/${customer.id}`}
                            exercises={exercises}
                          />
                          <CancelAppointmentButton
                            appointmentId={slot.id}
                            redirectTo={`/admin/customers/${customer.id}`}
                            size="sm"
                          />
                        </>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        );
      })}

      <div className="mb-6">
        <AddPackDialog customerId={customer.id} packages={packages} />
      </div>

      <Button variant="outline" render={<Link href="/admin/customers" />}>
        Kembali ke daftar
      </Button>
    </div>
  );
}
