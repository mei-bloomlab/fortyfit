import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/studio/page-header";

export default function CustomerNotFound() {
  return (
    <div>
      <PageHeader
        title="Customer tidak ketemu"
        description="Mungkin sudah dihapus, atau tautannya salah."
      />
      <Button render={<Link href="/admin/customers" />}>Kembali ke daftar</Button>
    </div>
  );
}
