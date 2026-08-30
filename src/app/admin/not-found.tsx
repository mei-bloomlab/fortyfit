import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/studio/page-header";

export default function OpsNotFound() {
  return (
    <div>
      <PageHeader
        title="Halaman ops tidak ketemu"
        description="Kembali ke meja operasi."
      />
      <Button render={<Link href="/admin" />}>Hari ini</Button>
    </div>
  );
}
