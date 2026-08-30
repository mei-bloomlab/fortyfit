import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/studio/empty-state";
import { PageHeader } from "@/components/studio/page-header";
import {
  dispatchRemindersAction,
  retryReminderAction,
  scanAndDispatchAction,
  skipReminderAction,
} from "@/lib/actions";
import { KIND_LABEL, STATUS_LABEL, STATUS_TONE, reminderHeadline } from "@/lib/labels";
import { listReminders } from "@/lib/queries";
import { getWhatsAppAdapter } from "@/lib/openwa/adapter";
import {
  ADMIN_NOTICE_KIND,
  CUSTOMER_MANUAL_KIND,
  CUSTOMER_THANKS_KIND,
  MORNING_DIGEST_KIND,
} from "@/lib/openwa/messages";
import { formatDateTime } from "@/lib/time";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function RemindersPage() {
  const [reminders, wa] = await Promise.all([
    listReminders(),
    getWhatsAppAdapter().status(),
  ]);

  const adminNotices = reminders.filter((item) => item.kind === ADMIN_NOTICE_KIND);
  const morningDigest = reminders.filter((item) => item.kind === MORNING_DIGEST_KIND);
  const customerThanks = reminders.filter((item) => item.kind === CUSTOMER_THANKS_KIND);
  const customerManual = reminders.filter((item) => item.kind === CUSTOMER_MANUAL_KIND);
  const known = new Set([
    ADMIN_NOTICE_KIND,
    MORNING_DIGEST_KIND,
    CUSTOMER_THANKS_KIND,
    CUSTOMER_MANUAL_KIND,
  ]);
  const other = reminders.filter((item) => !known.has(item.kind));

  return (
    <div>
      <PageHeader
        eyebrow="WhatsApp"
        title="Antrian reminder"
        description="Daftar notice admin dan reminder customer. Ambang sisa sesi dan nomor WA admin ada di Setting."
        actions={
          <>
            <form action={scanAndDispatchAction}>
              <Button type="submit" variant="outline">
                Scan / kirim ulang antrian admin
              </Button>
            </form>
            <form action={dispatchRemindersAction}>
              <Button type="submit" variant="outline">
                Kirim antrian pending
              </Button>
            </form>
          </>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Status saluran</CardTitle>
          <CardDescription>{wa.detail}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{wa.mode}</Badge>
            <Badge variant={wa.ready ? "secondary" : "destructive"}>
              {wa.ready ? "siap" : "belum live"}
            </Badge>
            <Button variant="outline" size="sm" render={<Link href="/admin/setting" />}>
              Buka Setting
            </Button>
          </div>
          {wa.mode === "enqueue" ? (
            <p className="text-sm leading-6 text-muted-foreground">
              Server hanya menulis antrian. Pesan keluar setelah laptop studio
              menjalankan npm run openwa. Scan QR pengirim ada di Setting, di
              browser pada Mac yang sama — bukan di terminal. Nomor admin,
              ambang, dan jam ringkasan juga di Setting.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <ReminderGroup
        title="Notif otomatis ke admin"
        description="Masuk ke WA admin setelah sisa sesi menyentuh ambang. Bukan ke HP client."
        emptyTitle="Belum ada notif admin"
        emptyDescription="Tandai sesi selesai sampai sisa paket masuk ambang. Notice terkirim sendiri."
        items={adminNotices}
        destination="WA admin"
      />

      <ReminderGroup
        title="Ringkasan pagi"
        description="Satu daftar customer di ambang, dikirim ke WA admin sekali per hari."
        emptyTitle="Belum ada ringkasan pagi"
        emptyDescription="Laptop studio mengirim ringkasan setelah jam yang diatur di Setting."
        items={morningDigest}
        destination="WA admin"
      />

      <ReminderGroup
        title="Ucapan terima kasih ke customer"
        description="Masuk antrian setelah sesi ditandai selesai, beserta daftar gerakan kalau ada."
        emptyTitle="Belum ada ucapan terima kasih"
        emptyDescription="Tandai sesi selesai dari jadwal atau dashboard."
        items={customerThanks}
        destination="WA customer"
      />

      <ReminderGroup
        title="Reminder manual ke customer"
        description="Terkirim ke nomor WhatsApp customer, hanya setelah tombol diklik."
        emptyTitle="Belum ada reminder customer"
        emptyDescription="Buka daftar atau detail client, lalu tekan “Kirim reminder” kalau mau mengingatkan mereka."
        items={customerManual}
        destination="WA customer"
      />

      {other.length > 0 ? (
        <ReminderGroup
          title="Lainnya"
          description="Antrian dengan jenis lama atau tidak dikenal."
          emptyTitle=""
          emptyDescription=""
          items={other}
        />
      ) : null}
    </div>
  );
}

function ReminderGroup({
  title,
  description,
  emptyTitle,
  emptyDescription,
  items,
  destination,
}: {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  destination?: string;
  items: Awaited<ReturnType<typeof listReminders>>;
}) {
  return (
    <section className="mb-8">
      <div className="mb-3">
        <h2 className="font-heading text-lg font-medium">{title}</h2>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {items.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} size="sm">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle>{reminderHeadline(item)}</CardTitle>
                  <Badge variant={STATUS_TONE[item.status] ?? "outline"}>
                    {STATUS_LABEL[item.status] ?? item.status}
                  </Badge>
                </div>
                <CardDescription>
                  {KIND_LABEL[item.kind] ?? item.kind}
                  {destination ? ` · ${destination}` : ""} · {item.channel} · percobaan{" "}
                  {item.attempts}
                  {item.sentAt ? ` · terkirim ${formatDateTime(item.sentAt)}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6">{item.payload}</p>
                {item.lastError ? (
                  <p className="mt-2 text-sm text-destructive">{item.lastError}</p>
                ) : null}
                {item.status === "failed" || item.status === "pending" ? (
                  <div className="mt-3 flex gap-2">
                    {item.status === "failed" ? (
                      <form action={retryReminderAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <Button type="submit" size="sm">
                          Kirim ulang
                        </Button>
                      </form>
                    ) : null}
                    <form action={skipReminderAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <Button type="submit" size="sm" variant="outline">
                        Skip
                      </Button>
                    </form>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
