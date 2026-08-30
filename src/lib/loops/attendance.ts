import { prisma } from "@/lib/db";
import { runLoop, type LoopTick } from "@/lib/engineering/loop";

export type AttendanceObservation = {
  appointmentId: string;
  status: string;
  packId: string | null;
  remaining: number | null;
  hasWorkout: boolean;
};

export async function observeAppointment(
  appointmentId: string,
): Promise<AttendanceObservation> {
  const appointment = await prisma.appointment.findUniqueOrThrow({
    where: { id: appointmentId },
    include: { pack: true, workout: true },
  });

  return {
    appointmentId,
    status: appointment.status,
    packId: appointment.packId,
    remaining: appointment.pack?.remaining ?? null,
    hasWorkout: Boolean(appointment.workout),
  };
}

export async function completeAppointment(appointmentId: string) {
  return prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.findUniqueOrThrow({
      where: { id: appointmentId },
      include: { pack: true, workout: true },
    });

    if (appointment.status === "completed") {
      return appointment;
    }

    if (appointment.packId && appointment.pack) {
      await tx.sessionPack.update({
        where: { id: appointment.packId },
        data: {
          used: { increment: 1 },
          remaining: Math.max(0, appointment.pack.remaining - 1),
        },
      });
    }

    return tx.appointment.update({
      where: { id: appointmentId },
      data: { status: "completed" },
      include: { pack: true, workout: true },
    });
  });
}

export async function runAttendanceLoop(
  appointmentId: string,
): Promise<LoopTick<AttendanceObservation, { status: string; hasWorkout: boolean }>[]> {
  return runLoop({
    name: "attendance",
    maxAttempts: 1,
    observe: () => observeAppointment(appointmentId),
    decide: (obs) => {
      if (obs.status === "cancelled") {
        return { kind: "stop", reason: "Janji sudah dibatalkan" };
      }
      if (obs.status === "completed") {
        return { kind: "stop", reason: "Sesi sudah dicatat selesai" };
      }
      return { kind: "act", action: "complete", payload: appointmentId };
    },
    act: async (id) => {
      const updated = await completeAppointment(id);
      return { status: updated.status, hasWorkout: Boolean(updated.workout) };
    },
    verify: (_obs, act) => ({
      ok: act.status === "completed",
      reason:
        act.status === "completed"
          ? "Sesi selesai, 1 paket terpotong"
          : "Gagal menandai sesi selesai",
      route: act.hasWorkout ? "scan_balance" : "log_workout",
    }),
  });
}
