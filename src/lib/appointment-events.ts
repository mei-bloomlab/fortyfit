import { prisma } from "@/lib/db";
import { CANCELLED_KIND, MOVED_KIND, hoursNotice } from "@/lib/scheduling";

type AppointmentRow = {
  id: string;
  customerId: string;
  startsAt: Date | null;
};

export async function recordAppointmentCancelled(
  appointment: AppointmentRow,
  now = new Date(),
) {
  await prisma.appointmentEvent.create({
    data: {
      appointmentId: appointment.id,
      customerId: appointment.customerId,
      kind: CANCELLED_KIND,
      fromStartsAt: appointment.startsAt,
      hoursNotice: hoursNotice(appointment.startsAt, now),
    },
  });
}

/** Hitting Simpan without touching the time should not pollute the history. */
export async function recordAppointmentMoved(
  appointment: AppointmentRow,
  toStartsAt: Date,
  now = new Date(),
) {
  if (appointment.startsAt?.getTime() === toStartsAt.getTime()) return;

  await prisma.appointmentEvent.create({
    data: {
      appointmentId: appointment.id,
      customerId: appointment.customerId,
      kind: MOVED_KIND,
      fromStartsAt: appointment.startsAt,
      toStartsAt,
      hoursNotice: hoursNotice(appointment.startsAt, now),
    },
  });
}
