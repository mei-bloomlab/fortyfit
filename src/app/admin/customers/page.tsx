import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateCustomerDialog } from "@/components/studio/customer-forms";
import { SendCustomerReminderButton } from "@/components/studio/send-customer-reminder-button";
import { EmptyState } from "@/components/studio/empty-state";
import { PageHeader } from "@/components/studio/page-header";
import { WipeCustomersPanel } from "@/components/studio/wipe-customers";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/labels";
import { listCustomers, listPackages } from "@/lib/queries";
import { formatDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const [customers, packages] = await Promise.all([listCustomers(), listPackages()]);

  return (
    <div>
      <PageHeader
        eyebrow="Customer"
        title="Daftar client FortyFit"
        description="Klik nama untuk isi tanggal dan jam tiap sesi."
      />

      <div className="mb-6">
        <CreateCustomerDialog packages={packages} />
      </div>

      {customers.length === 0 ? (
        <EmptyState
          title="Belum ada customer"
          description="Tambah client pertama, isi paket sesi, lalu atur jadwal di kalender."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
          <table className="w-full min-w-[56rem] table-fixed caption-bottom text-sm">
            <colgroup>
              <col className="w-[20%]" />
              <col className="w-[14%]" />
              <col className="w-[18%]" />
              <col className="w-[12%]" />
              <col className="w-[16%]" />
              <col className="w-[20%]" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Sesi</TableHead>
                <TableHead>Jadwal berikutnya</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => {
                const pack = customer.packs[0];
                const next = customer.appointments[0];
                return (
                  <TableRow key={customer.id}>
                    <TableCell className="whitespace-normal align-top">
                      <Link href={`/admin/customers/${customer.id}`} className="font-medium hover:underline">
                        {customer.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {customer.notes || customer.goal}
                        {customer.status !== "active" ? (
                          <>
                            {" · "}
                            <Badge variant={STATUS_TONE[customer.status] ?? "outline"}>
                              {STATUS_LABEL[customer.status] ?? customer.status}
                            </Badge>
                          </>
                        ) : null}
                      </p>
                    </TableCell>
                    <TableCell className="align-top">{customer.phone}</TableCell>
                    <TableCell className="whitespace-normal align-top">
                      {pack?.program ?? "—"}
                    </TableCell>
                    <TableCell className="align-top">
                      {pack ? (
                        <Badge variant={pack.remaining <= 3 ? "destructive" : "secondary"}>
                          {pack.used}/{pack.purchased} · sisa {pack.remaining}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="whitespace-normal align-top">
                      {next ? formatDateTime(next.startsAt) : "Belum dijadwalkan"}
                    </TableCell>
                    <TableCell className="align-top whitespace-normal">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <SendCustomerReminderButton
                          customerId={customer.id}
                          size="sm"
                          label="Kirim reminder"
                        />
                        <Link
                          href={`/admin/jadwal?customer=${customer.id}`}
                          className="text-sm whitespace-nowrap text-primary hover:underline"
                        >
                          Atur jadwal
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </table>
        </div>
      )}

      <div className="mt-8">
        <WipeCustomersPanel customerCount={customers.length} />
      </div>
    </div>
  );
}
