"use client";

import { Button } from "@/components/ui/button";
import { SessionWorkoutForm } from "@/components/studio/session-workout-form";
import { cancelAppointmentAction, completeSessionAction } from "@/lib/actions";
import type { WorkoutLineDraft } from "@/lib/loops/workout-log";
import type { CatalogExercise } from "@/lib/studio-catalog";

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

export function AppointmentActions({
  appointmentId,
  customerId,
  redirectTo = "/admin/jadwal",
  exercises = [],
  initialLines = [],
}: {
  appointmentId: string;
  customerId: string;
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
      <CancelAppointmentButton
        appointmentId={appointmentId}
        redirectTo={redirectTo}
      />
    </div>
  );
}
