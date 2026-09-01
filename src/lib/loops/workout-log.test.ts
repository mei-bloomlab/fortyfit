import assert from "node:assert/strict";
import test from "node:test";
import { formatExerciseList } from "../openwa/messages";
import { formatExerciseDetail } from "../workout-kg";
import {
  exercisesFromFormData,
  formatSets,
  normalizeExercise,
  parseExercises,
  workoutLinesFromJson,
} from "./workout-log";

function sessionForm(rows: { name: string; set: string; rep: string; kg?: string }[]) {
  const formData = new FormData();
  for (const row of rows) {
    formData.append("exerciseName", row.name);
    formData.append("exerciseSet", row.set);
    formData.append("exerciseRep", row.rep);
    formData.append("exerciseKg", row.kg ?? "");
  }
  return formData;
}

test("set and rep are optional, and a half-filled row keeps its number", () => {
  assert.equal(formatSets(3, 8), "3x8");
  assert.equal(formatSets(3, undefined), "3 set");
  assert.equal(formatSets(undefined, 12), "12 rep");
  assert.equal(formatSets(undefined, undefined), undefined);
  assert.equal(formatSets(undefined, undefined, "3x8"), "3x8");
});

test("blank set and rep boxes still save the exercise name", () => {
  const exercises = exercisesFromFormData(
    sessionForm([
      { name: "Goblet squat", set: "3", rep: "8" },
      { name: "Plank", set: "", rep: "" },
      { name: "Bird dog", set: "3", rep: "" },
      { name: "Dead hang", set: "", rep: "20" },
      { name: "", set: "4", rep: "10" },
    ]),
  );

  assert.deepEqual(
    exercises.map((item) => [item.name, item.set, item.rep, item.sets]),
    [
      ["Goblet squat", 3, 8, "3x8"],
      ["Plank", undefined, undefined, undefined],
      ["Bird dog", 3, undefined, "3 set"],
      ["Dead hang", undefined, 20, "20 rep"],
    ],
  );
});

test("kg alone is enough to describe a row", () => {
  const [row] = exercisesFromFormData(
    sessionForm([{ name: "Farmer carry", set: "", rep: "", kg: "16" }]),
  );
  assert.equal(row?.set, undefined);
  assert.equal(row?.rep, undefined);
  assert.equal(row?.kg, 16);
  assert.equal(formatExerciseDetail(row?.sets, row?.kg), "16kg");
});

test("recap to the customer reads cleanly without set and rep", () => {
  const payload = formatExerciseList([
    { name: "Plank" },
    { name: "Bird dog", sets: "3 set" },
    { name: "Farmer carry", kg: 16 },
  ]);
  assert.match(payload, /• Plank$/m);
  assert.match(payload, /• Bird dog \(3 set\)/);
  assert.match(payload, /• Farmer carry \(16kg\)/);
  assert.doesNotMatch(payload, /undefined|NaN|\(\)/);
});

test("a saved row reloads into the form with its blanks intact", () => {
  const stored = JSON.stringify([
    normalizeExercise({ name: "Plank" }),
    normalizeExercise({ name: "Bird dog", set: 3 }),
  ]);
  assert.deepEqual(workoutLinesFromJson(stored), [
    { name: "Plank", set: "", rep: "", kg: "" },
    { name: "Bird dog", set: "3", rep: "", kg: "" },
  ]);
});

test("old workout rows without kg still parse and display", () => {
  const raw = JSON.stringify([
    { name: "Goblet squat", sets: "3x6" },
    { name: "Bird dog", sets: "3x6/sisi" },
  ]);
  const parsed = parseExercises(raw);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0]?.name, "Goblet squat");
  assert.equal(parsed[0]?.kg, undefined);
  assert.equal(parsed[1]?.name, "Bird dog");
  assert.equal(parsed[1]?.kg, undefined);
  assert.deepEqual(workoutLinesFromJson(raw), [
    { name: "Goblet squat", set: "3", rep: "6", kg: "" },
    { name: "Bird dog", set: "3", rep: "6", kg: "" },
  ]);
  assert.equal(formatExerciseDetail("3x6", parsed[0]?.kg), "3x6");
  assert.equal(formatExerciseDetail("3x6/sisi", parsed[1]?.kg), "3x6/sisi");
  assert.doesNotMatch(JSON.stringify(parsed), /kg/);
});

test("empty kg stays optional and is omitted from stored JSON", () => {
  const [row] = exercisesFromFormData(
    sessionForm([{ name: "Squat", set: "3", rep: "8", kg: "  " }]),
  );
  assert.equal(row?.name, "Squat");
  assert.equal(row?.sets, "3x8");
  assert.equal(row?.kg, undefined);
  assert.equal(formatExerciseDetail(row?.sets, row?.kg), "3x8");
  assert.equal(JSON.stringify(normalizeExercise(row!)).includes("kg"), false);
});

test("filled kg persists on the row and reloads into the form", () => {
  const [row] = exercisesFromFormData(
    sessionForm([{ name: "Goblet squat", set: "3", rep: "6", kg: "12" }]),
  );
  assert.equal(row?.kg, 12);
  const stored = JSON.stringify([normalizeExercise(row!)]);
  assert.match(stored, /"kg":12/);
  assert.deepEqual(workoutLinesFromJson(stored), [
    { name: "Goblet squat", set: "3", rep: "6", kg: "12" },
  ]);
  assert.equal(formatExerciseDetail(row?.sets, row?.kg), "3x6, 12kg");
});

test("zero or invalid kg is treated as empty", () => {
  assert.equal(normalizeExercise({ name: "Plank", sets: "3x30", kg: 0 }).kg, undefined);
  assert.equal(formatExerciseDetail("3x30", 0), "3x30");
  assert.equal(formatExerciseDetail("3x6", undefined), "3x6");
});
