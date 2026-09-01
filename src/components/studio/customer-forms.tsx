"use client";

import { useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ActionPanel } from "@/components/studio/action-panel";
import { Field, fieldControlClass } from "@/components/studio/field";
import {
  addPackAction,
  addWorkoutAction,
  completeSessionAction,
  createCustomerAction,
  saveSessionSlotAction,
  updateCustomerAction,
} from "@/lib/actions";
import { CONDITIONS } from "@/lib/engineering/rules";
import { packageLabel, type CatalogExercise, type CatalogPackage } from "@/lib/studio-catalog";
import { toLocalInputValue } from "@/lib/time";

function ProgramSelect({
  packages,
  defaultValue,
  name = "program",
  value,
  onChange,
}: {
  packages: CatalogPackage[];
  defaultValue?: string;
  name?: string;
  value?: string;
  onChange?: (name: string) => void;
}) {
  const current =
    defaultValue && !packages.some((item) => item.name === defaultValue)
      ? defaultValue
      : undefined;
  const first = packages[0]?.name ?? defaultValue ?? "";
  const selectMode = onChange
    ? { value: value ?? first, onChange: (event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value) }
    : { defaultValue: defaultValue ?? first };

  return (
    <select name={name} className={fieldControlClass} {...selectMode}>
      {packages.map((item) => (
        <option key={item.id} value={item.name}>
          {packageLabel(item.name, item.sessions, item.priceIdr)}
        </option>
      ))}
      {current ? <option value={current}>{current}</option> : null}
    </select>
  );
}

function ProgramAndSessionsFields({
  packages,
  defaultProgram,
}: {
  packages: CatalogPackage[];
  defaultProgram?: string;
}) {
  const initial =
    defaultProgram && packages.some((item) => item.name === defaultProgram)
      ? defaultProgram
      : packages[0]?.name ?? defaultProgram ?? "";
  const [program, setProgram] = useState(initial);
  const selected = packages.find((item) => item.name === program);
  const [sessions, setSessions] = useState(String(selected?.sessions ?? 4));

  function chooseProgram(next: string) {
    setProgram(next);
    const match = packages.find((item) => item.name === next);
    if (match) setSessions(String(match.sessions));
  }

  return (
    <>
      <Field label="Program">
        <ProgramSelect packages={packages} value={program} onChange={chooseProgram} />
      </Field>
      <Field label="Sesi">
        <Input
          name="purchased"
          type="number"
          min={1}
          max={60}
          value={sessions}
          onChange={(event) => setSessions(event.target.value)}
        />
      </Field>
    </>
  );
}

export function CreateCustomerDialog({ packages }: { packages: CatalogPackage[] }) {
  return (
    <ActionPanel
      label="Tambah customer"
      title="Customer baru"
      description="Isi nama, WA, program, dan kondisi. Jumlah sesi mengikuti paket. Slot jadwal langsung dibuat."
      defaultOpen
    >
      <form className="grid gap-3" action={createCustomerAction}>
        <Field label="Nama">
          <Input name="name" required placeholder="Mei" />
        </Field>
        <Field label="NO WA">
          <Input name="phone" required placeholder="0812..." />
        </Field>
        <ProgramAndSessionsFields packages={packages} />
        <Field label="Kondisi">
          <Input name="notes" list="kondisi-options" placeholder="Obesitas" />
          <datalist id="kondisi-options">
            {CONDITIONS.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </Field>
        <Button type="submit">Simpan</Button>
      </form>
    </ActionPanel>
  );
}

export function CustomerProfileForm({
  customerId,
  name,
  phone,
  program,
  purchased,
  kondisi,
  packages,
}: {
  customerId: string;
  name: string;
  phone: string;
  program: string;
  purchased: number;
  kondisi: string;
  packages: CatalogPackage[];
}) {
  return (
    <form className="grid gap-3" action={updateCustomerAction}>
      <input type="hidden" name="customerId" value={customerId} />
      <Field label="Nama">
        <Input name="name" required defaultValue={name} />
      </Field>
      <Field label="NO WA">
        <Input name="phone" required defaultValue={phone} />
      </Field>
      <Field label="Program">
        <ProgramSelect packages={packages} defaultValue={program} />
      </Field>
      <Field label="Sesi">
        <Input value={String(purchased)} readOnly disabled />
      </Field>
      <Field label="Kondisi">
        <Input name="notes" list="kondisi-options-detail" defaultValue={kondisi} />
        <datalist id="kondisi-options-detail">
          {CONDITIONS.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      </Field>
      <Button type="submit">Simpan data</Button>
    </form>
  );
}

export function SessionSlotForm({
  appointmentId,
  customerId,
  slot,
  startsAt,
}: {
  appointmentId: string;
  customerId: string;
  slot: number;
  startsAt: Date | string | null;
}) {
  return (
    <form
      action={saveSessionSlotAction}
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
    >
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <input type="hidden" name="customerId" value={customerId} />
      <p className="w-20 shrink-0 font-medium">Sesi {slot},</p>
      <Input
        key={startsAt ? String(startsAt) : "empty"}
        name="startsAt"
        type="datetime-local"
        defaultValue={startsAt ? toLocalInputValue(startsAt) : ""}
        className="sm:max-w-xs"
      />
      <Button type="submit" size="sm">
        Simpan
      </Button>
    </form>
  );
}

export function AddPackDialog({
  customerId,
  packages,
}: {
  customerId: string;
  packages: CatalogPackage[];
}) {
  return (
    <ActionPanel label="Beli paket" title="Paket sesi baru" variant="outline">
      <form className="grid gap-3" action={addPackAction}>
        <input type="hidden" name="customerId" value={customerId} />
        <ProgramAndSessionsFields packages={packages} />
        <Button type="submit">Tambah paket</Button>
      </form>
    </ActionPanel>
  );
}

type ExerciseLine = { key: string; name: string; set: string; rep: string; kg: string };

function nextLineKey() {
  return `line-${Math.random().toString(36).slice(2, 9)}`;
}

function ExerciseLinesField({ exercises }: { exercises: CatalogExercise[] }) {
  const first = exercises[0]?.name ?? "";
  const [rows, setRows] = useState<ExerciseLine[]>([
    { key: "line-1", name: first, set: "3", rep: "8", kg: "" },
  ]);

  return (
    <div className="grid gap-2">
      <div className="hidden text-xs text-muted-foreground sm:grid sm:grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_4.5rem_auto] sm:gap-2">
        <span>Gerakan</span>
        <span>Set</span>
        <span>Rep</span>
        <span>kg</span>
        <span className="sr-only">Hapus</span>
      </div>
      {rows.map((row, index) => (
        <div
          key={row.key}
          className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_4.5rem_auto] sm:items-end"
        >
          <Field label={index === 0 ? "Gerakan" : "Gerakan"}>
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
              required
              value={row.set}
              onChange={(event) => {
                const next = [...rows];
                next[index] = { ...next[index], set: event.target.value };
                setRows(next);
              }}
            />
          </Field>
          <Field label="Rep">
            <Input
              name="exerciseRep"
              type="number"
              min={1}
              max={50}
              required
              value={row.rep}
              onChange={(event) => {
                const next = [...rows];
                next[index] = { ...next[index], rep: event.target.value };
                setRows(next);
              }}
            />
          </Field>
          <Field label="kg">
            <Input
              name="exerciseKg"
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              value={row.kg}
              onChange={(event) => {
                const next = [...rows];
                next[index] = { ...next[index], kg: event.target.value };
                setRows(next);
              }}
            />
          </Field>
          {rows.length > 1 ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="sm:mb-0.5"
              onClick={() => setRows(rows.filter((_, itemIndex) => itemIndex !== index))}
            >
              Hapus
            </Button>
          ) : (
            <span className="hidden sm:block" />
          )}
        </div>
      ))}
      <div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            setRows([...rows, { key: nextLineKey(), name: first, set: "3", rep: "8", kg: "" }])
          }
        >
          Tambah gerakan
        </Button>
      </div>
    </div>
  );
}

export function CompleteSessionDialog({
  appointmentId,
  customerId,
  customerName,
  redirectTo,
  exercises,
}: {
  appointmentId: string;
  customerId: string;
  customerName: string;
  redirectTo?: string;
  exercises: CatalogExercise[];
}) {
  return (
    <ActionPanel
      label="Selesai + catat"
      title={`Selesaikan sesi ${customerName}`}
      description="Tandai selesai, potong 1 sesi, lalu catat gerakan dari daftar jenis latihan."
      size="sm"
    >
      <form className="grid gap-3" action={completeSessionAction}>
        <input type="hidden" name="appointmentId" value={appointmentId} />
        <input type="hidden" name="customerId" value={customerId} />
        {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}
        <Field label="Fokus hari ini">
          <Input name="focus" required placeholder="Squat foundation" />
        </Field>
        <ExerciseLinesField exercises={exercises} />
        <Field label="Catatan coach">
          <Textarea name="coachNote" placeholder="Cue, progres, yang perlu diulang." />
        </Field>
        <Button type="submit">Tutup sesi</Button>
      </form>
    </ActionPanel>
  );
}

export function AddWorkoutDialog({
  customerId,
  exercises,
}: {
  customerId: string;
  exercises: CatalogExercise[];
}) {
  return (
    <ActionPanel
      label="Catat progress"
      title="Progress latihan"
      variant="outline"
    >
      <form className="grid gap-3" action={addWorkoutAction}>
        <input type="hidden" name="customerId" value={customerId} />
        <Field label="Tanggal">
          <Input
            name="performedAt"
            type="datetime-local"
            required
            defaultValue={toLocalInputValue(new Date())}
          />
        </Field>
        <Field label="Fokus">
          <Input name="focus" required />
        </Field>
        <ExerciseLinesField exercises={exercises} />
        <Field label="Catatan coach">
          <Textarea name="coachNote" />
        </Field>
        <Button type="submit">Simpan progress</Button>
      </form>
    </ActionPanel>
  );
}
