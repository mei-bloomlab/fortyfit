"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/studio/field";
import { EmptyState } from "@/components/studio/empty-state";
import { AppointmentActions } from "@/components/studio/appointment-actions";
import { scheduleOpenSlotAction } from "@/lib/actions";
import type { ScheduleCustomer } from "@/lib/queries";
import type { CatalogExercise } from "@/lib/studio-catalog";
import { formatTime, toLocalInputValue } from "@/lib/time";
import { cn } from "@/lib/utils";

type Mode = "customer" | "time";

function matchesQuery(customer: ScheduleCustomer, query: string) {
  const haystack = `${customer.name} ${customer.phone} ${customer.program} ${customer.kondisi ?? ""}`.toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

export function ScheduleWorkspace({
  customers,
  exercises = [],
  initialCustomerId,
  initialMode,
}: {
  customers: ScheduleCustomer[];
  exercises?: CatalogExercise[];
  initialCustomerId?: string;
  initialMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(initialMode ?? "customer");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(initialCustomerId ?? "");
  const [startsAt, setStartsAt] = useState(toLocalInputValue(new Date()));

  const selected = customers.find((item) => item.id === selectedId) ?? null;
  const bookable = customers.filter((item) => item.remaining > 0 && item.openSlots > 0);

  const filtered = useMemo(() => {
    const source = mode === "time" ? bookable : customers;
    return source.filter((item) => matchesQuery(item, query));
  }, [bookable, customers, mode, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={mode === "customer" ? "default" : "outline"}
          onClick={() => {
            setMode("customer");
            setQuery("");
          }}
        >
          Pilih customer dulu
        </Button>
        <Button
          type="button"
          variant={mode === "time" ? "default" : "outline"}
          onClick={() => {
            setMode("time");
            setQuery("");
          }}
        >
          Pilih jam dulu
        </Button>
      </div>

      {mode === "customer" ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <section className="space-y-3">
            <Field label="Cari customer">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nama, WA, program..."
              />
            </Field>
            <CustomerList
              customers={filtered}
              selectedId={selectedId}
              onSelect={setSelectedId}
              emptyTitle="Customer tidak ketemu"
              emptyDescription="Coba nama lain, atau tambah customer dari menu Customer."
            />
          </section>

          <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            {selected ? (
              <CustomerScheduleForm
                customer={selected}
                exercises={exercises}
                startsAt={startsAt}
                onStartsAtChange={setStartsAt}
              />
            ) : (
              <EmptyState
                title="Pilih customer"
                description="Lihat sisa sesi, lalu isi tanggal dan jam untuk slot yang masih kosong."
              />
            )}
          </section>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="max-w-md">
            <Field label="Tanggal dan jam">
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
              />
            </Field>
            <p className="mt-2 text-sm text-muted-foreground">
              Berikutnya pilih customer yang sesinya masih sisa dan belum dijadwalkan semua.
            </p>
          </div>
          <Field label="Cari yang sesinya masih sisa">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nama customer..."
            />
          </Field>
          {filtered.length === 0 ? (
            <EmptyState
              title="Tidak ada slot kosong"
              description="Semua customer yang tersisa sudah dijadwalkan, atau paketnya habis."
            />
          ) : (
            <div className="space-y-2">
              {filtered.map((customer) => (
                <form
                  key={customer.id}
                  action={scheduleOpenSlotAction}
                  className="flex flex-col gap-3 rounded-xl border border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <input type="hidden" name="customerId" value={customer.id} />
                  <input type="hidden" name="startsAt" value={startsAt} />
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {customer.program}
                      {customer.kondisi ? ` · ${customer.kondisi}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={customer.remaining <= 2 ? "destructive" : "secondary"}>
                      sisa {customer.remaining} sesi
                    </Badge>
                    <Badge variant="outline">{customer.openSlots} belum dijadwalkan</Badge>
                    <Button type="submit" size="sm" disabled={!startsAt}>
                      Pakai slot ini
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      render={<Link href={`/admin/customers/${customer.id}`} />}
                    >
                      Detail
                    </Button>
                  </div>
                </form>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CustomerList({
  customers,
  selectedId,
  onSelect,
  emptyTitle,
  emptyDescription,
}: {
  customers: ScheduleCustomer[];
  selectedId: string;
  onSelect: (id: string) => void;
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (customers.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
      {customers.map((customer) => {
        const active = customer.id === selectedId;
        return (
          <button
            key={customer.id}
            type="button"
            onClick={() => onSelect(customer.id)}
            className={cn(
              "flex w-full flex-col rounded-xl border px-3 py-2 text-left transition-colors sm:flex-row sm:items-center sm:justify-between",
              active
                ? "border-primary bg-primary/8"
                : "border-border/70 hover:bg-muted/40",
            )}
          >
            <span>
              <span className="block font-medium">{customer.name}</span>
              <span className="text-xs text-muted-foreground">
                {customer.program}
                {customer.kondisi ? ` · ${customer.kondisi}` : ""}
              </span>
            </span>
            <Badge
              variant={
                customer.remaining === 0
                  ? "outline"
                  : customer.remaining <= 2
                    ? "destructive"
                    : "secondary"
              }
              className="mt-2 w-fit sm:mt-0"
            >
              sisa {customer.remaining} sesi
            </Badge>
          </button>
        );
      })}
    </div>
  );
}

function CustomerScheduleForm({
  customer,
  exercises,
  startsAt,
  onStartsAtChange,
}: {
  customer: ScheduleCustomer;
  exercises: CatalogExercise[];
  startsAt: string;
  onStartsAtChange: (value: string) => void;
}) {
  const canBook = customer.remaining > 0 && customer.openSlots > 0;

  return (
    <div className="space-y-4">
      <div>
        <p className="font-heading text-xl">{customer.name}</p>
        <p className="text-sm text-muted-foreground">
          {customer.phone} · {customer.program}
          {customer.kondisi ? ` · ${customer.kondisi}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant={customer.remaining <= 2 ? "destructive" : "secondary"}>
          sisa {customer.remaining} dari {customer.purchased} sesi
        </Badge>
        <Badge variant="outline">
          {customer.openSlots} belum dijadwalkan
          {customer.nextSlot ? ` · slot berikutnya sesi ${customer.nextSlot}` : ""}
        </Badge>
      </div>

      {canBook ? (
        <form action={scheduleOpenSlotAction} className="grid gap-3">
          <input type="hidden" name="customerId" value={customer.id} />
          <Field label="Tanggal dan jam">
            <Input
              name="startsAt"
              type="datetime-local"
              required
              value={startsAt}
              onChange={(event) => onStartsAtChange(event.target.value)}
            />
          </Field>
          <Button type="submit">Jadwalkan sesi berikutnya</Button>
        </form>
      ) : (
        <EmptyState
          title={customer.remaining === 0 ? "Paket sudah habis" : "Semua sisa sesi sudah dijadwalkan"}
          description={
            customer.remaining === 0
              ? "Beli paket baru dari halaman customer kalau mau lanjut."
              : "Tidak ada slot kosong. Ubah tanggal di halaman detail customer, atau selesaikan sesi yang sudah ada."
          }
        />
      )}

      {customer.scheduledAppointments.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Sudah dijadwalkan</p>
          {customer.scheduledAppointments.map((item) => (
            <div
              key={item.id}
              className="space-y-3 rounded-xl border border-border/70 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm">
                  <span className="font-medium">
                    Sesi {item.slot} · {formatTime(item.startsAt)}
                  </span>
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  render={<Link href={`/admin/jadwal/${item.id}`} />}
                >
                  Buka sesi
                </Button>
              </div>
              <AppointmentActions
                appointmentId={item.id}
                customerId={customer.id}
                customerName={customer.name}
                exercises={exercises}
                startsAt={item.startsAt}
              />
            </div>
          ))}
        </div>
      ) : null}

      <Button variant="outline" render={<Link href={`/admin/customers/${customer.id}`} />}>
        Buka detail customer
      </Button>
    </div>
  );
}
