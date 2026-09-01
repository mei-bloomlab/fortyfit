"use client";

import { useState } from "react";
import { ActionPanel } from "@/components/studio/action-panel";
import { Field, fieldControlClass } from "@/components/studio/field";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { completeSessionAction, saveSessionWorkoutAction } from "@/lib/actions";
import { cn } from "@/lib/utils";
import type { WorkoutLineDraft } from "@/lib/loops/workout-log";
import type { CatalogExercise } from "@/lib/studio-catalog";

type Line = WorkoutLineDraft;

function emptyLine(exercises: CatalogExercise[]): Line {
  return { name: exercises[0]?.name ?? "", set: "", rep: "", kg: "" };
}

function ExerciseRows({
  exercises,
  initialLines,
}: {
  exercises: CatalogExercise[];
  initialLines: Line[];
}) {
  const [rows, setRows] = useState<Line[]>(
    initialLines.length > 0 ? initialLines : [emptyLine(exercises)],
  );

  return (
    <div className="grid gap-2">
      {rows.map((row, index) => (
        <div
          key={index}
          className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_4.5rem_auto_4.5rem_auto_4.5rem_auto_auto] sm:items-end"
        >
          <Field label="Latihan">
            <select
              name="exerciseName"
              required
              className={fieldControlClass}
              value={row.name}
              onChange={(event) => {
                const next = [...rows];
                next[index] = { ...next[index], name: event.target.value };
                setRows(next);
              }}
            >
              {exercises.length === 0 ? (
                <option value="">Belum ada jenis latihan</option>
              ) : null}
              {exercises.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
              {row.name && !exercises.some((item) => item.name === row.name) ? (
                <option value={row.name}>{row.name}</option>
              ) : null}
            </select>
          </Field>
          <Field label="Set">
            <Input
              name="exerciseSet"
              type="number"
              min={1}
              max={20}
              inputMode="numeric"
              placeholder="—"
              value={row.set}
              onChange={(event) => {
                const next = [...rows];
                next[index] = { ...next[index], set: event.target.value };
                setRows(next);
              }}
            />
          </Field>
          <p className="hidden pb-2 text-sm text-muted-foreground sm:block">set</p>
          <Field label="Rep">
            <Input
              name="exerciseRep"
              type="number"
              min={1}
              max={50}
              inputMode="numeric"
              placeholder="—"
              value={row.rep}
              onChange={(event) => {
                const next = [...rows];
                next[index] = { ...next[index], rep: event.target.value };
                setRows(next);
              }}
            />
          </Field>
          <p className="hidden pb-2 text-sm text-muted-foreground sm:block">rep</p>
          <Field label="kg">
            <Input
              name="exerciseKg"
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              placeholder="—"
              value={row.kg ?? ""}
              onChange={(event) => {
                const next = [...rows];
                next[index] = { ...next[index], kg: event.target.value };
                setRows(next);
              }}
            />
          </Field>
          <p className="hidden pb-2 text-sm text-muted-foreground sm:block">kg</p>
          {rows.length > 1 ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setRows(rows.filter((_, itemIndex) => itemIndex !== index))}
            >
              Hapus
            </Button>
          ) : (
            <span className="hidden sm:block" />
          )}
        </div>
      ))}
      <p className="text-sm leading-6 text-muted-foreground">
        Set, Rep, dan kg semuanya opsional. Kosongkan kalau tidak dicatat — nama
        latihan tetap masuk rekap ke customer.
      </p>
      <div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setRows([...rows, emptyLine(exercises)])}
        >
          Tambah latihan
        </Button>
      </div>
    </div>
  );
}

export function SessionWorkoutForm({
  appointmentId,
  customerId,
  exercises,
  initialLines = [],
  redirectTo,
}: {
  appointmentId: string;
  customerId: string;
  exercises: CatalogExercise[];
  initialLines?: Line[];
  redirectTo?: string;
}) {
  return (
    <form className="grid gap-3" action={saveSessionWorkoutAction}>
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <input type="hidden" name="customerId" value={customerId} />
      {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}
      <ExerciseRows exercises={exercises} initialLines={initialLines} />
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={cn(buttonVariants({ variant: "outline" }))}>
          Simpan
        </button>
        <button
          type="submit"
          className={cn(buttonVariants())}
          formAction={completeSessionAction}
        >
          Selesai
        </button>
      </div>
    </form>
  );
}

export function StartSessionPanel({
  appointmentId,
  customerId,
  customerName,
  exercises,
  initialLines = [],
  redirectTo,
  defaultOpen = false,
}: {
  appointmentId: string;
  customerId: string;
  customerName: string;
  exercises: CatalogExercise[];
  initialLines?: Line[];
  redirectTo?: string;
  defaultOpen?: boolean;
}) {
  const saved = initialLines.length > 0;

  return (
    <ActionPanel
      label="Mulai sesi"
      title={`Sesi ${customerName}`}
      description={
        saved
          ? "Latihan sudah tersimpan. Simpan lagi tanpa potong sisa, atau Selesai untuk potong 1 sesi."
          : "Isi gerakan dulu. Simpan menyimpan latihan tanpa potong sisa sesi. Selesai menandai selesai dan memotong 1 sesi."
      }
      size="sm"
      defaultOpen={defaultOpen || saved}
    >
      <SessionWorkoutForm
        appointmentId={appointmentId}
        customerId={customerId}
        exercises={exercises}
        initialLines={initialLines}
        redirectTo={redirectTo}
      />
    </ActionPanel>
  );
}
