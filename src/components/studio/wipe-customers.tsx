import { ActionPanel } from "@/components/studio/action-panel";
import { Field } from "@/components/studio/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { wipeCustomersAction } from "@/lib/actions";
import { WIPE_CUSTOMERS_CONFIRM } from "@/lib/labels";

const warning =
  "Semua client ikut terhapus, termasuk data dummy/demo (Mei, Made Ayu, dan lainnya), plus seluruh jadwal, paket sesi, catatan latihan, dan reminder. Pengaturan studio, katalog paket, dan jenis latihan tetap. Tidak bisa dibatalkan. Data dummy bisa diisi ulang lewat npm run db:seed.";

export function WipeCustomersForm({ customerCount }: { customerCount: number }) {
  return (
    <form action={wipeCustomersAction} className="grid gap-3">
      <p className="text-sm leading-6 text-muted-foreground">{warning}</p>
      <p className="text-sm">
        {customerCount === 0
          ? "Tidak ada customer saat ini."
          : `Saat ini ada ${customerCount} customer.`}
      </p>
      <Field label={`Ketik ${WIPE_CUSTOMERS_CONFIRM} untuk konfirmasi`}>
        <Input
          name="confirm"
          required
          autoComplete="off"
          spellCheck={false}
          placeholder={WIPE_CUSTOMERS_CONFIRM}
          pattern={WIPE_CUSTOMERS_CONFIRM}
          disabled={customerCount === 0}
        />
      </Field>
      <div>
        <Button type="submit" variant="destructive" disabled={customerCount === 0}>
          Hapus semua customer
        </Button>
      </div>
    </form>
  );
}

export function WipeCustomersPanel({ customerCount }: { customerCount: number }) {
  return (
    <ActionPanel
      label="Hapus semua customer"
      title="Hapus semua client dan jadwal"
      description="Langkah kedua: ketik konfirmasi di bawah. Setting, paket, dan jenis latihan tidak ikut terhapus."
      variant="destructive"
    >
      <details className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
        <summary className="cursor-pointer text-sm font-medium text-destructive">
          Saya yakin, lanjut hapus
        </summary>
        <div className="mt-3">
          <WipeCustomersForm customerCount={customerCount} />
        </div>
      </details>
    </ActionPanel>
  );
}
