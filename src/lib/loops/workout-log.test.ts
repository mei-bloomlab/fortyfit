import assert from "node:assert/strict";
import test from "node:test";
import { formatExerciseDetail } from "../workout-kg";
import {
  exercisesFromFormData,
  normalizeExercise,
  parseExercises,
  workoutLinesFromJson,
} from "./workout-log";

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
  const formData = new FormData();
  formData.append("exerciseName", "Squat");
  formData.append("exerciseSet", "3");
  formData.append("exerciseRep", "8");
  formData.append("exerciseKg", "  ");

  const [row] = exercisesFromFormData(formData);
  assert.equal(row?.name, "Squat");
  assert.equal(row?.sets, "3x8");
  assert.equal(row?.kg, undefined);
  assert.equal(formatExerciseDetail(row?.sets, row?.kg), "3x8");
  assert.equal(JSON.stringify(normalizeExercise(row!)).includes("kg"), false);
});

test("filled kg persists on the row and reloads into the form", () => {
  const formData = new FormData();
  formData.append("exerciseName", "Goblet squat");
  formData.append("exerciseSet", "3");
  formData.append("exerciseRep", "6");
  formData.append("exerciseKg", "12");

  const [row] = exercisesFromFormData(formData);
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
