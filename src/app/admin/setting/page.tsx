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
  NotifySettingsForm,
  PackageCatalog,
} from "@/components/studio/settings-forms";
import { WipeCustomersForm } from "@/components/studio/wipe-customers";
import { getSettingsPageData } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function SettingPage() {
  const { settings, packages, exercises, customerCount } = await getSettingsPageData();

  return (
    <div>
      <PageHeader
        eyebrow="Setting"
        title="Pengaturan studio"
        description="Atur notif sisa sesi, nomor WA admin, paket (nama, jumlah sesi, harga), dan jenis latihan. Perubahan di sini yang dipakai saat tambah customer dan mencatat sesi."
      />

      <div className="grid gap-6">
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
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>WA Admin</CardTitle>
            <CardDescription>
              Nomor tujuan notice sisa sesi. Reminder ke customer tetap dikirim
              manual dari daftar atau detail client.
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
