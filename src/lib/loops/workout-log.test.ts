import assert from "node:assert/strict";
import test from "node:test";
import {
  exercisesFromFormData,
  formatSets,
  normalizeExercise,
  workoutLinesFromJson,
} from "./workout-log";
import { formatExerciseList } from "@/lib/openwa/messages";

function sessionForm(rows: { name: string; set: string; rep: string }[]) {
  const formData = new FormData();
  for (const row of rows) {
    formData.append("exerciseName", row.name);
    formData.append("exerciseSet", row.set);
    formData.append("exerciseRep", row.rep);
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

test("recap to the customer reads cleanly without set and rep", () => {
  const payload = formatExerciseList([
    { name: "Plank" },
    { name: "Bird dog", sets: "3 set" },
  ]);
  assert.match(payload, /• Plank$/m);
  assert.match(payload, /• Bird dog \(3 set\)/);
  assert.doesNotMatch(payload, /undefined|NaN|\(\)/);
});

test("a saved row reloads into the form with its blanks intact", () => {
  const stored = JSON.stringify([
    normalizeExercise({ name: "Plank" }),
    normalizeExercise({ name: "Bird dog", set: 3 }),
  ]);
  assert.deepEqual(workoutLinesFromJson(stored), [
    { name: "Plank", set: "", rep: "" },
    { name: "Bird dog", set: "3", rep: "" },
  ]);
});
