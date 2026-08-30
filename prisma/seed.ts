import { PrismaClient } from "@prisma/client";
import { addHours, addDays, setHours, setMinutes, startOfDay } from "date-fns";
import { DEFAULT_EXERCISES, DEFAULT_PACKAGES } from "../src/lib/studio-catalog";

const prisma = new PrismaClient();

type SeedExercise = { name: string; sets: string };

function at(dayOffset: number, hour: number, minute = 0) {
  const base = startOfDay(addDays(new Date(), dayOffset));
  return setMinutes(setHours(base, hour), minute);
}

function pastDates(count: number, startOffset: number, hour: number, minute = 0) {
  return Array.from({ length: count }, (_, index) =>
    at(-(startOffset + index), hour, minute),
  );
}

async function main() {
  await prisma.graphRun.deleteMany();
  await prisma.reminder.deleteMany();
  await prisma.workoutLog.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.sessionPack.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.exerciseType.deleteMany();
  await prisma.programPackage.deleteMany();
  await prisma.studioSettings.deleteMany();

  await prisma.studioSettings.create({
    data: {
      id: "fortyfit",
      reminderThreshold: 2,
      adminPhone: "6285155070866",
      autoNotifyAdmin: true,
      openWaMode: "enqueue",
      customerThanksEnabled: true,
      morningDigestEnabled: true,
      morningDigestTime: "09:30",
    },
  });

  await prisma.programPackage.createMany({
    data: DEFAULT_PACKAGES,
  });
  await prisma.exerciseType.createMany({
    data: DEFAULT_EXERCISES,
  });

  const customers = [
    {
      name: "Mei",
      phone: "081281199927",
      goal: "Fat Loss",
      notes: "Obesitas",
      program: "Fat Loss",
      purchased: 4,
      used: 0,
      remaining: 4,
      completedAt: [] as Date[],
      scheduledAt: [] as Date[],
    },
    {
      name: "Made Ayu Pratiwi",
      phone: "081238110001",
      goal: "Mulai dari nol",
      notes: "Pemula, masih ragu di gym umum.",
      program: "Personal Training Pemula",
      purchased: 12,
      used: 9,
      remaining: 3,
      completedAt: pastDates(9, 3, 7),
      scheduledAt: [at(0, 7, 0)],
    },
    {
      name: "I Gede Putra",
      phone: "081238110002",
      goal: "Turun lemak",
      notes: "Kerja kantoran, sering skip kalau malam hujan.",
      program: "Fat Loss Starter",
      purchased: 8,
      used: 7,
      remaining: 1,
      completedAt: pastDates(7, 4, 8, 30),
      scheduledAt: [at(0, 8, 30)],
    },
    {
      name: "Ni Komang Sari",
      phone: "081238110003",
      goal: "Bangun kekuatan",
      notes: "Postur membungkuk dari kerja laptop.",
      program: "Strength Foundation",
      purchased: 12,
      used: 4,
      remaining: 8,
      completedAt: pastDates(4, 5, 16),
      scheduledAt: [at(0, 16, 0)],
    },
    {
      name: "Wayan Adi Saputra",
      phone: "081238110004",
      goal: "Mulai dari nol",
      notes: "Baru mulai minggu ini.",
      program: "Personal Training Pemula",
      purchased: 8,
      used: 1,
      remaining: 7,
      completedAt: pastDates(1, 1, 7),
      scheduledAt: [at(1, 7, 0)],
    },
    {
      name: "Putu Lestari",
      phone: "081238110005",
      goal: "Turun lemak",
      notes: "Paket hampir habis, belum konfirmasi perpanjang.",
      program: "Fat Loss Starter",
      purchased: 8,
      used: 8,
      remaining: 0,
      completedAt: pastDates(8, 2, 16),
      scheduledAt: [] as Date[],
    },
    {
      name: "Ketut Adnyana",
      phone: "081238110006",
      goal: "Perbaiki postur",
      notes: "Sakit pinggang lama, gerakan harus pelan.",
      program: "Strength Foundation",
      purchased: 10,
      used: 3,
      remaining: 7,
      completedAt: pastDates(3, 8, 7, 30),
      scheduledAt: [at(2, 7, 30)],
    },
    {
      name: "Dewa Ayu Candra",
      phone: "081238110007",
      goal: "Mulai dari nol",
      notes: "Lebih nyaman sesi pagi.",
      program: "Personal Training Pemula",
      purchased: 8,
      used: 5,
      remaining: 3,
      completedAt: pastDates(5, 7, 7),
      scheduledAt: [at(1, 17, 0)],
    },
    {
      name: "Nyoman Bagus",
      phone: "081238110008",
      goal: "Bangun kekuatan",
      notes: "Target consitent 2x seminggu.",
      program: "Strength Foundation",
      purchased: 12,
      used: 6,
      remaining: 6,
      completedAt: pastDates(6, 6, 18),
      scheduledAt: [at(3, 18, 0)],
    },
  ];

  const created = [];
  for (const item of customers) {
    const customer = await prisma.customer.create({
      data: {
        name: item.name,
        phone: item.phone,
        goal: item.goal,
        notes: item.notes,
        packs: {
          create: {
            program: item.program,
            priceIdr:
              DEFAULT_PACKAGES.find((pack) => pack.name === item.program)?.priceIdr ??
              null,
            purchased: item.purchased,
            used: item.used,
            remaining: item.remaining,
          },
        },
      },
      include: { packs: true },
    });

    const pack = customer.packs[0];
    const appointments = [];
    for (let slot = 1; slot <= item.purchased; slot += 1) {
      let startsAt: Date | null = null;
      let status = "unscheduled";
      if (slot <= item.completedAt.length) {
        startsAt = item.completedAt[slot - 1];
        status = "completed";
      } else if (slot - item.completedAt.length <= item.scheduledAt.length) {
        startsAt = item.scheduledAt[slot - item.completedAt.length - 1];
        status = "scheduled";
      }

      appointments.push(
        await prisma.appointment.create({
          data: {
            customerId: customer.id,
            packId: pack.id,
            slot,
            startsAt,
            status,
            location: "Studio Tabanan",
          },
        }),
      );
    }

    created.push({ ...customer, pack, appointments });
  }

  const [, ayu, gede, komang, , putu, , candra, nyoman] = created;

  const workouts: {
    customerId: string;
    appointmentId?: string;
    performedAt: Date;
    focus: string;
    exercises: SeedExercise[];
    coachNote: string;
  }[] = [
    {
      customerId: ayu.id,
      appointmentId: ayu.appointments[0]?.id,
      performedAt: at(-3, 7, 0),
      focus: "Squat foundation",
      exercises: [
        { name: "Sit to stand", sets: "3x8" },
        { name: "Goblet squat", sets: "3x6" },
        { name: "Bird dog", sets: "3x6/sisi" },
      ],
      coachNote: "Lutut masih masuk dalam, kuatkan cue lutut ke luar.",
    },
    {
      customerId: gede.id,
      appointmentId: gede.appointments[0]?.id,
      performedAt: at(-4, 8, 30),
      focus: "Hinge + fat loss circuit",
      exercises: [
        { name: "Hip hinge dowel", sets: "3x8" },
        { name: "Incline push-up", sets: "3x6" },
        { name: "Farmer carry", sets: "4x20m" },
      ],
      coachNote: "Nafas masih tertahan. Istirahat 60 detik cukup.",
    },
    {
      customerId: komang.id,
      appointmentId: komang.appointments[0]?.id,
      performedAt: at(-5, 16, 0),
      focus: "Upper back + hinge",
      exercises: [
        { name: "Band row", sets: "3x10" },
        { name: "Romanian deadlift", sets: "3x6" },
        { name: "Dead bug", sets: "3x6/sisi" },
      ],
      coachNote: "Sudah lebih tegak. Naikkan tempo row minggu depan.",
    },
    {
      customerId: putu.id,
      appointmentId: putu.appointments[0]?.id,
      performedAt: at(-2, 16, 0),
      focus: "Full body finisher",
      exercises: [
        { name: "Step-up", sets: "3x8/sisi" },
        { name: "Push-up dinding", sets: "3x8" },
        { name: "Glute bridge", sets: "3x10" },
      ],
      coachNote: "Sesi terakhir paket. Tawarkan perpanjang 8 sesi.",
    },
    {
      customerId: nyoman.id,
      appointmentId: nyoman.appointments[0]?.id,
      performedAt: at(-6, 18, 0),
      focus: "Strength lower",
      exercises: [
        { name: "Goblet squat", sets: "4x6" },
        { name: "Split squat", sets: "3x6/sisi" },
        { name: "Calf raise", sets: "3x12" },
      ],
      coachNote: "Siap naik beban 2 kg.",
    },
    {
      customerId: candra.id,
      performedAt: addHours(at(-7, 7, 0), 0),
      focus: "Mobility + core",
      exercises: [
        { name: "Cat cow", sets: "2x8" },
        { name: "Dead bug", sets: "3x6" },
        { name: "Glute bridge", sets: "3x8" },
      ],
      coachNote: "Pemanasan lebih lama karena kaku pagi.",
    },
  ];

  for (const item of workouts) {
    await prisma.workoutLog.create({
      data: {
        customerId: item.customerId,
        appointmentId: item.appointmentId,
        performedAt: item.performedAt,
        focus: item.focus,
        exercisesJson: JSON.stringify(item.exercises),
        coachNote: item.coachNote,
      },
    });
  }

  await prisma.reminder.create({
    data: {
      customerId: putu.id,
      packId: putu.pack.id,
      kind: "low_sessions",
      payload:
        "Notice FortyFit: Putu Lestari (081238110005) sisa 0 sesi Fat Loss Starter. Paket sudah habis. Follow-up perpanjang.",
      status: "pending",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
