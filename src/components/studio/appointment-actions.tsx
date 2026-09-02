"use client";

import { useState } from "react";
import { ActionPanel } from "@/components/studio/action-panel";
import { ClashNotice } from "@/components/studio/clash-notice";
import { Field } from "@/components/studio/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SessionWorkoutForm } from "@/components/studio/session-workout-form";
import {
  cancelAppointmentAction,
  completeSessionAction,
  rescheduleAppointmentAction,
} from "@/lib/actions";
import type { WorkoutLineDraft } from "@/lib/loops/workout-log";
import { findClashes, type BusySlot } from "@/lib/scheduling";
import type { CatalogExercise } from "@/lib/studio-catalog";
import { toLocalInputValue } from "@/lib/time";

export function CompleteSessionButton({
  appointmentId,
  customerId,
  redirectTo = "/admin/jadwal",
}: {
  appointmentId: string;
  customerId: string;
  redirectTo?: string;
}) {
  return (
    <form action={completeSessionAction}>
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <input type="hidden" name="customerId" value={customerId} />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <Button type="submit">Selesai</Button>
    </form>
  );
}

export function CancelAppointmentButton({
  appointmentId,
  redirectTo = "/admin/jadwal",
  size = "default",
}: {
  appointmentId: string;
  redirectTo?: string;
  size?: "default" | "sm";
}) {
  return (
    <form action={cancelAppointmentAction}>
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <Button type="submit" variant="outline" size={size}>
        Cancel
      </Button>
    </form>
  );
}

export function RescheduleAppointmentPanel({
  appointmentId,
  startsAt,
  redirectTo = "/admin/jadwal",
  size = "default",
  busy = [],
}: {
  appointmentId: string;
  startsAt?: Date | string | null;
  redirectTo?: string;
  size?: "default" | "sm";
  busy?: BusySlot[];
}) {
  const [picked, setPicked] = useState(startsAt ? toLocalInputValue(startsAt) : "");
  const clashes = findClashes(picked, busy, { ignoreId: appointmentId });

  return (
    <ActionPanel
      label="Ubah jadwal"
      title="Pindahkan sesi ini"
      description="Pilih tanggal dan jam baru. Sesi yang sama dipindah, jadi sisa paket tidak terpotong dan tidak perlu Cancel dulu."
      variant="outline"
      size={size}
    >
      <form className="grid gap-3" action={rescheduleAppointmentAction}>
        <input type="hidden" name="appointmentId" value={appointmentId} />
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <Field label="Tanggal dan jam baru">
          <Input
            name="startsAt"
            type="datetime-local"
            required
            value={picked}
            onChange={(event) => setPicked(event.target.value)}
          />
        </Field>
        <ClashNotice clashes={clashes} />
        <Button type="submit">Pindahkan sesi</Button>
      </form>
    </ActionPanel>
  );
}

export function AppointmentActions({
  appointmentId,
  customerId,
  redirectTo = "/admin/jadwal",
  exercises = [],
  initialLines = [],
  startsAt,
  busy = [],
}: {
  appointmentId: string;
  customerId: string;
  startsAt?: Date | string | null;
  busy?: BusySlot[];
  customerName?: string;
  redirectTo?: string;
  showNoteForm?: boolean;
  exercises?: CatalogExercise[];
  initialLines?: WorkoutLineDraft[];
}) {
  return (
    <div className="space-y-3">
      <SessionWorkoutForm
        appointmentId={appointmentId}
        customerId={customerId}
        exercises={exercises}
        initialLines={initialLines}
        redirectTo={redirectTo}
      />
      <div className="flex flex-wrap items-start gap-2">
        <RescheduleAppointmentPanel
          appointmentId={appointmentId}
          startsAt={startsAt}
          redirectTo={redirectTo}
          busy={busy}
        />
        <CancelAppointmentButton
          appointmentId={appointmentId}
          redirectTo={redirectTo}
        />
      </div>
    </div>
  );
}
