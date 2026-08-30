import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/studio/page-header";
import {
  AdminPhoneForm,
  ExerciseCatalog,
  MorningDigestForm,
  NotifySettingsForm,
  PackageCatalog,
} from "@/components/studio/settings-forms";
import { WhatsAppQrPanel } from "@/components/studio/whatsapp-qr-panel";
import { WipeCustomersForm } from "@/components/studio/wipe-customers";
import { browserSidecarUrl } from "@/lib/openwa/sidecar-browser";
import { getSettingsPageData } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function SettingPage() {
  const { settings, packages, exercises, customerCount } = await getSettingsPageData();

  return (
    <div>
      <PageHeader
        eyebrow="Setting"
        title="Pengaturan studio"
        description="Scan WhatsApp pengirim, atur notif sisa sesi, ringkasan pagi, nomor WA admin, paket, dan jenis latihan. Perubahan tersimpan di database — tidak perlu deploy ulang."
      />

      <div className="grid gap-6">
        <WhatsAppQrPanel sidecarUrl={browserSidecarUrl()} />

        <Card>
          <CardHeader>
            <CardTitle>Notif sisa sesi</CardTitle>
            <CardDescription>
              Saat sisa sesi paket customer menyentuh angka ini, sistem kirim notice
              ke WhatsApp admin. Tidak perlu tekan kirim dulu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NotifySettingsForm
              threshold={settings.reminderThreshold}
              autoNotifyAdmin={settings.autoNotifyAdmin}
              customerThanksEnabled={settings.customerThanksEnabled}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ringkasan pagi</CardTitle>
            <CardDescription>
              Satu WhatsApp ke admin berisi siapa saja yang sisa sesinya sudah
              masuk ambang. Dikirim dari laptop studio, paling lambat begitu
              laptop nyala setelah jam yang dipilih.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MorningDigestForm
              enabled={settings.morningDigestEnabled}
              time={settings.morningDigestTime}
              timezone={settings.timezone}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>WA Admin</CardTitle>
            <CardDescription>
              Nomor penerima notice sisa sesi dan ringkasan pagi. Bukan nomor
              pengirim yang di-scan di panel QR. Reminder ke customer tetap
              dikirim manual dari daftar atau detail client.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminPhoneForm adminPhone={settings.adminPhone} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Paket</CardTitle>
            <CardDescription>
              Jenis paket, jumlah sesi, dan harga (rupiah). Daftar ini muncul di
              dropdown Program saat tambah customer atau beli paket baru.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PackageCatalog packages={packages} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Jenis latihan</CardTitle>
            <CardDescription>
              Gerakan yang bisa dipilih saat menandai sesi selesai. Coach pilih
              nama, lalu isi jumlah set dan rep — misalnya Squat 3 set 8 rep.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExerciseCatalog exercises={exercises} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hapus semua customer</CardTitle>
            <CardDescription>
              Bersihkan data dummy/demo kapan Anda siap. Setting, paket, dan jenis
              latihan tidak ikut terhapus.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WipeCustomersForm customerCount={customerCount} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
