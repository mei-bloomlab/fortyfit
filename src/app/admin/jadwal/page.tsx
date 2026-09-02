import { PageHeader } from "@/components/studio/page-header";
import { ScheduleWorkspace } from "@/components/studio/schedule-workspace";
import { listBusySlots, listExercises, listScheduleCustomers } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string; mode?: string }>;
}) {
  const { customer, mode } = await searchParams;
  const [customers, exercises, busy] = await Promise.all([
    listScheduleCustomers(),
    listExercises(),
    listBusySlots(),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Atur jadwal"
        title="Isi jam latihan"
        description="Pilih customer dulu lalu set tanggal, atau pilih jam dulu lalu cari client yang sesinya masih sisa."
      />

      <ScheduleWorkspace
        customers={customers}
        exercises={exercises}
        busy={busy}
        initialCustomerId={customer}
        initialMode={mode === "time" ? "time" : "customer"}
      />
    </div>
  );
}
