import { prisma } from "@/lib/db";
import { CUSTOMER_THANKS_KIND, buildCustomerThanksMessage } from "@/lib/openwa/messages";
import { parseExercises } from "@/lib/loops/workout-log";

export async function enqueueCustomerThanks(appointmentId: string): Promise<{
  createdId?: string;
  skipped: boolean;
  reason: string;
}> {
  const settings = await prisma.studioSettings.upsert({
    where: { id: "fortyfit" },
    update: {},
    create: { id: "fortyfit" },
  });

  if (!settings.customerThanksEnabled) {
    return { skipped: true, reason: "Ucapan terima kasih customer sedang mati" };
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      customer: true,
      pack: true,
      workout: true,
      reminders: {
        where: { kind: CUSTOMER_THANKS_KIND, status: { in: ["pending", "sent"] } },
      },
    },
  });

  if (!appointment || appointment.status !== "completed") {
    return { skipped: true, reason: "Sesi belum selesai, ucapan belum dibuat" };
  }
  if (appointment.reminders.length > 0) {
    return { skipped: true, reason: "Ucapan terima kasih untuk sesi ini sudah ada" };
  }

  const exercises = appointment.workout
    ? parseExercises(appointment.workout.exercisesJson)
    : [];
  const reminder = await prisma.reminder.create({
    data: {
      customerId: appointment.customerId,
      packId: appointment.packId,
      appointmentId: appointment.id,
      kind: CUSTOMER_THANKS_KIND,
      channel: "whatsapp",
      payload: buildCustomerThanksMessage({
        name: appointment.customer.name,
        phone: appointment.customer.phone,
        exercises: exercises.map((item) => ({
          name: item.name,
          sets: item.sets,
          kg: item.kg,
        })),
        template: settings.waTplCustomerThanks,
      }),
    },
  });

  return {
    createdId: reminder.id,
    skipped: false,
    reason: exercises.length > 0
      ? "Ucapan terima kasih plus daftar gerakan masuk antrian"
      : "Ucapan terima kasih masuk antrian (tanpa daftar gerakan)",
  };
}
