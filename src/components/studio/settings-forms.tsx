"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/studio/field";
import {
  archiveExerciseAction,
  archivePackageAction,
  createExerciseAction,
  createPackageAction,
  restoreExerciseAction,
  restorePackageAction,
  updateAdminPhoneAction,
  updateMorningDigestAction,
  updateNotifySettingsAction,
  updatePackageAction,
  updateWaTemplatesAction,
} from "@/lib/actions";
import {
  DEFAULT_ADMIN_NOTICE_TEMPLATE,
  DEFAULT_CUSTOMER_MANUAL_TEMPLATE,
  DEFAULT_CUSTOMER_THANKS_TEMPLATE,
  DEFAULT_MORNING_DIGEST_TEMPLATE,
  templateOrDefault,
} from "@/lib/openwa/messages";
import { formatIdr, type CatalogExercise, type CatalogPackage } from "@/lib/studio-catalog";

export function NotifySettingsForm({
  threshold,
  autoNotifyAdmin,
  customerThanksEnabled,
}: {
  threshold: number;
  autoNotifyAdmin: boolean;
  customerThanksEnabled: boolean;
}) {
  return (
    <form action={updateNotifySettingsAction} className="grid gap-4">
      <input type="hidden" name="autoNotifyAdminField" value="1" />
      <input type="hidden" name="customerThanksEnabledField" value="1" />
      <Field label="Kirim notice saat sisa sesi mencapai">
        <Input
          name="threshold"
          type="number"
          min={0}
          max={20}
          defaultValue={threshold}
        />
      </Field>
      <p className="text-sm leading-6 text-muted-foreground">
        Isi 2 artinya begitu sisa sesi jadi 2, 1, atau 0, admin dapat notice:
        nama customer, nomor, program, dan sisa sesi. Satu notice per paket
        untuk tiap jumlah sisa, supaya tidak spam. Ambang yang sama dipakai
        ringkasan pagi dan tombol scan antrian.
      </p>
      <label className="flex items-start gap-3 rounded-xl border border-border/70 p-3">
        <input
          type="checkbox"
          name="autoNotifyAdmin"
          value="1"
          defaultChecked={autoNotifyAdmin}
          className="mt-1 size-4 accent-primary"
        />
        <span>
          <span className="block text-sm font-medium">Kirim otomatis ke WA admin</span>
          <span className="block text-sm leading-6 text-muted-foreground">
            Nyala: setelah sesi ditandai selesai dan sisa masuk ambang, notice
            per customer masuk antrian ke nomor admin. Tidak menggantikan
            ringkasan pagi.
          </span>
        </span>
      </label>
      <label className="flex items-start gap-3 rounded-xl border border-border/70 p-3">
        <input
          type="checkbox"
          name="customerThanksEnabled"
          value="1"
          defaultChecked={customerThanksEnabled}
          className="mt-1 size-4 accent-primary"
        />
        <span>
          <span className="block text-sm font-medium">
            Ucapan terima kasih ke customer setelah selesai
          </span>
          <span className="block text-sm leading-6 text-muted-foreground">
            Nyala: setelah tombol selesai, customer dapat WA terima kasih plus
            daftar gerakan dari catatan sesi. Kalau tidak ada gerakan, ucapan
            tetap dikirim tanpa daftar palsu.
          </span>
        </span>
      </label>
      <div>
        <Button type="submit">Simpan notif</Button>
      </div>
    </form>
  );
}

export function MorningDigestForm({
  enabled,
  time,
  timezone,
}: {
  enabled: boolean;
  time: string;
  timezone: string;
}) {
  return (
    <form action={updateMorningDigestAction} className="grid gap-4">
      <input type="hidden" name="morningDigestEnabledField" value="1" />
      <label className="flex items-start gap-3 rounded-xl border border-border/70 p-3">
        <input
          type="checkbox"
          name="morningDigestEnabled"
          value="1"
          defaultChecked={enabled}
          className="mt-1 size-4 accent-primary"
        />
        <span>
          <span className="block text-sm font-medium">Kirim ringkasan pagi ke admin</span>
          <span className="block text-sm leading-6 text-muted-foreground">
            Satu WA berisi daftar customer aktif yang sisa sesinya di ambang.
            Bukan satu WA per nama.
          </span>
        </span>
      </label>
      <Field label="Jam ringkasan pagi">
        <Input name="morningDigestTime" type="time" required defaultValue={time} />
      </Field>
      <Field label="Zona waktu">
        <Input name="timezone" required defaultValue={timezone} />
      </Field>
      <p className="text-sm leading-6 text-muted-foreground">
        Default 09:30 Asia/Makassar (WITA). Kalau laptop nyala lebih siang,
        ringkasan tetap dikirim sekali di drain pertama hari itu.
      </p>
      <div>
        <Button type="submit">Simpan ringkasan pagi</Button>
      </div>
    </form>
  );
}

export function WaTemplatesForm({
  adminNotice,
  customerManual,
  customerThanks,
  morningDigest,
}: {
  adminNotice: string;
  customerManual: string;
  customerThanks: string;
  morningDigest: string;
}) {
  return (
    <form action={updateWaTemplatesAction} className="grid gap-6">
      <p className="text-sm leading-6 text-muted-foreground">
        Satu teks untuk semua customer. Variabel di dalam kurung kurawal diisi
        otomatis saat pesan dibuat. Antrian yang sudah ada tidak berubah.
        Kosongkan kotak lalu simpan untuk kembali ke teks bawaan.
      </p>
      <TemplateField
        label="Notice admin — sisa sesi"
        name="waTplAdminNotice"
        defaultValue={templateOrDefault(adminNotice, DEFAULT_ADMIN_NOTICE_TEMPLATE)}
        hints="{nama} nama customer · {telepon} nomor WA · {sisa} angka sisa sesi · {program} nama paket · {tindak} kalimat habis/tinggal Nx. Biarkan frasa sisa {sisa} sesi supaya notice tidak dobel."
      />
      <TemplateField
        label="Pengingat manual ke customer"
        name="waTplCustomerManual"
        defaultValue={templateOrDefault(customerManual, DEFAULT_CUSTOMER_MANUAL_TEMPLATE)}
        hints="{nama} · {telepon} · {sisa} angka sisa · {program} · {sisa_kalimat} kalimat sisa (habis atau masih ada)."
      />
      <TemplateField
        label="Ucapan terima kasih setelah sesi"
        name="waTplCustomerThanks"
        defaultValue={templateOrDefault(customerThanks, DEFAULT_CUSTOMER_THANKS_TEMPLATE)}
        hints="{nama} · {gerakan} judul plus daftar gerakan dari catatan sesi, atau kosong kalau tidak ada gerakan."
      />
      <TemplateField
        label="Ringkasan pagi ke admin"
        name="waTplMorningDigest"
        defaultValue={templateOrDefault(morningDigest, DEFAULT_MORNING_DIGEST_TEMPLATE)}
        hints="{tanggal} · {ambang} angka ambang · {daftar} daftar customer (atau kalimat kosong kalau tidak ada yang masuk ambang)."
      />
      <div>
        <Button type="submit">Simpan teks WhatsApp</Button>
      </div>
    </form>
  );
}

function TemplateField({
  label,
  name,
  defaultValue,
  hints,
}: {
  label: string;
  name: string;
  defaultValue: string;
  hints: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Field label={label}>
        <Textarea name={name} defaultValue={defaultValue} rows={5} className="min-h-28" />
      </Field>
      <p className="text-sm leading-6 text-muted-foreground">{hints}</p>
    </div>
  );
}

export function AdminPhoneForm({ adminPhone }: { adminPhone: string }) {
  return (
    <form action={updateAdminPhoneAction} className="grid gap-4">
      <Field label="Nomor WhatsApp admin">
        <Input name="adminPhone" required defaultValue={adminPhone} placeholder="62851..." />
      </Field>
      <p className="text-sm leading-6 text-muted-foreground">
        Pakai format 62, bukan 08. Ini nomor penerima digest dan notice admin —
        bukan nomor yang di-scan di panel QR. QR = pengirim (WA FortyFit).
        Ubah di sini saja — pemegang laptop tidak perlu edit kode.
      </p>
      <div>
        <Button type="submit">Simpan nomor</Button>
      </div>
    </form>
  );
}

export function PackageCatalog({ packages }: { packages: CatalogPackage[] }) {
  const active = packages.filter((item) => !item.archived);
  const archived = packages.filter((item) => item.archived);

  return (
    <div className="grid gap-6">
      <form action={createPackageAction} className="grid gap-3 sm:grid-cols-[1fr_6rem_10rem_auto]">
        <Field label="Nama paket">
          <Input name="name" required placeholder="Fat Loss" />
        </Field>
        <Field label="Sesi">
          <Input name="sessions" required type="number" min={1} max={60} placeholder="4" />
        </Field>
        <Field label="Harga (Rp)">
          <Input name="priceIdr" required inputMode="numeric" placeholder="2400000" />
        </Field>
        <div className="flex items-end">
          <Button type="submit">Tambah paket</Button>
        </div>
      </form>

      {active.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Belum ada paket aktif. Tambah di atas supaya dropdown customer tidak kosong.
        </p>
      ) : (
        <div className="grid gap-3">
          {active.map((item) => (
            <form
              key={item.id}
              action={updatePackageAction}
              className="grid gap-3 rounded-xl border border-border/70 p-3 sm:grid-cols-[1fr_6rem_10rem_auto_auto] sm:items-end"
            >
              <input type="hidden" name="id" value={item.id} />
              <Field label="Nama">
                <Input name="name" required defaultValue={item.name} />
              </Field>
              <Field label="Sesi">
                <Input
                  name="sessions"
                  required
                  type="number"
                  min={1}
                  max={60}
                  defaultValue={String(item.sessions)}
                />
              </Field>
              <Field label="Harga (Rp)">
                <Input
                  name="priceIdr"
                  required
                  inputMode="numeric"
                  defaultValue={String(item.priceIdr)}
                />
              </Field>
              <Button type="submit" size="sm">
                Simpan
              </Button>
              <Button type="submit" size="sm" variant="outline" formAction={archivePackageAction}>
                Arsipkan
              </Button>
            </form>
          ))}
        </div>
      )}

      {archived.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-sm font-medium">Diarsipkan</p>
          {archived.map((item) => (
            <form
              key={item.id}
              action={restorePackageAction}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-border/70 px-3 py-2"
            >
              <input type="hidden" name="id" value={item.id} />
              <span className="text-sm">
                {item.name} · {item.sessions} sesi · {formatIdr(item.priceIdr)}
              </span>
              <Button type="submit" size="sm" variant="ghost">
                Pulihkan
              </Button>
            </form>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ExerciseCatalog({ exercises }: { exercises: CatalogExercise[] }) {
  const active = exercises.filter((item) => !item.archived);
  const archived = exercises.filter((item) => item.archived);

  return (
    <div className="grid gap-6">
      <form action={createExerciseAction} className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Field label="Nama gerakan">
          <Input name="name" required placeholder="Squat" />
        </Field>
        <div className="flex items-end">
          <Button type="submit">Tambah jenis latihan</Button>
        </div>
      </form>

      {active.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Belum ada jenis latihan. Tambah supaya form catat sesi punya dropdown.
        </p>
      ) : (
        <ul className="grid gap-2">
          {active.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 px-3 py-2"
            >
              <span className="text-sm font-medium">{item.name}</span>
              <form action={archiveExerciseAction}>
                <input type="hidden" name="id" value={item.id} />
                <Button type="submit" size="sm" variant="outline">
                  Arsipkan
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {archived.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-sm font-medium">Diarsipkan</p>
          {archived.map((item) => (
            <form
              key={item.id}
              action={restoreExerciseAction}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-border/70 px-3 py-2"
            >
              <input type="hidden" name="id" value={item.id} />
              <span className="flex items-center gap-2 text-sm">
                {item.name}
                <Badge variant="outline">arsip</Badge>
              </span>
              <Button type="submit" size="sm" variant="ghost">
                Pulihkan
              </Button>
            </form>
          ))}
        </div>
      ) : null}
    </div>
  );
}
