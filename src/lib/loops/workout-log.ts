import { prisma } from "@/lib/db";
import { runLoop, type LoopTick } from "@/lib/engineering/loop";

export type WorkoutExercise = {
  name: string;
  sets?: string;
  set?: number;
  rep?: number;
  note?: string;
};

export type WorkoutInput = {
  customerId: string;
  appointmentId?: string;
  performedAt: Date;
  focus: string;
  exercises: WorkoutExercise[];
  coachNote?: string;
};

export function formatSets(set?: number, rep?: number, fallback?: string) {
  if (typeof set === "number" && typeof rep === "number") {
    return `${set}x${rep}`;
  }
  return fallback;
}

export function normalizeExercise(item: WorkoutExercise): WorkoutExercise {
  const fromSets = item.sets?.match(/^(\d+)\s*[x×]\s*(\d+)/i);
  const set = item.set ?? (fromSets ? Number(fromSets[1]) : undefined);
  const rep = item.rep ?? (fromSets ? Number(fromSets[2]) : undefined);
  return {
    name: item.name.trim(),
    set,
    rep,
    sets: formatSets(set, rep, item.sets),
    note: item.note,
  };
}

export function exercisesFromFormData(formData: FormData): WorkoutExercise[] {
  const names = formData.getAll("exerciseName").map((value) => String(value).trim());
  const sets = formData.getAll("exerciseSet").map((value) => String(value).trim());
  const reps = formData.getAll("exerciseRep").map((value) => String(value).trim());

  if (names.length > 0) {
    return names
      .map((name, index) => {
        if (!name) return null;
        const set = Number(sets[index]);
        const rep = Number(reps[index]);
        return normalizeExercise({
          name,
          set: Number.isFinite(set) && set > 0 ? set : undefined,
          rep: Number.isFinite(rep) && rep > 0 ? rep : undefined,
        });
      })
      .filter((item): item is WorkoutExercise => Boolean(item));
  }

  return String(formData.get("exercises") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, setsText] = line.split("|").map((part) => part.trim());
      return normalizeExercise({ name, sets: setsText });
    });
}

export async function saveWorkoutLog(input: WorkoutInput) {
  const data = {
    customerId: input.customerId,
    appointmentId: input.appointmentId || null,
    performedAt: input.performedAt,
    focus: input.focus,
    exercisesJson: JSON.stringify(input.exercises.map(normalizeExercise)),
    coachNote: input.coachNote || null,
  };

  if (input.appointmentId) {
    return prisma.workoutLog.upsert({
      where: { appointmentId: input.appointmentId },
      create: data,
      update: {
        performedAt: data.performedAt,
        focus: data.focus,
        exercisesJson: data.exercisesJson,
        coachNote: data.coachNote,
      },
    });
  }

  return prisma.workoutLog.create({ data });
}

export type WorkoutLineDraft = { name: string; set: string; rep: string };

export function workoutLinesFromJson(value?: string | null): WorkoutLineDraft[] {
  if (!value) return [];
  return parseExercises(value).map((item) => ({
    name: item.name,
    set: item.set != null ? String(item.set) : "",
    rep: item.rep != null ? String(item.rep) : "",
  }));
}

export async function runWorkoutLogLoop(
  input: WorkoutInput,
): Promise<LoopTick<{ customerId: string }, { id: string }>[]> {
  return runLoop({
    name: "workout_log",
    maxAttempts: 1,
    observe: async () => ({ customerId: input.customerId }),
    decide: () => {
      if (!input.focus.trim() || input.exercises.length === 0) {
        return { kind: "stop", reason: "Fokus latihan atau gerakan masih kosong" };
      }
      return { kind: "act", action: "save", payload: input };
    },
    act: async (payload) => {
      const saved = await saveWorkoutLog(payload);
      return { id: saved.id };
    },
    verify: (_obs, act) => ({
      ok: Boolean(act.id),
      reason: act.id ? "Progress latihan tersimpan" : "Gagal menyimpan progress",
      route: "scan_balance",
    }),
  });
}

export function parseExercises(value: string): WorkoutExercise[] {
  try {
    const parsed = JSON.parse(value) as WorkoutExercise[];
    return Array.isArray(parsed) ? parsed.map(normalizeExercise) : [];
  } catch {
    return [];
  }
}
