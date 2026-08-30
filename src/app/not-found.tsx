import Link from "next/link";
import { SiteShell } from "@/components/site/site-shell";

export default function NotFound() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="font-heading text-4xl">Halaman tidak ketemu</h1>
        <p className="mt-3 text-muted-foreground">
          Kembali ke beranda, atau buka program dan panduan.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
          >
            Beranda
          </Link>
          <Link
            href="/program"
            className="inline-flex h-10 items-center rounded-full border border-border px-5 text-sm"
          >
            Program
          </Link>
        </div>
      </div>
    </SiteShell>
  );
}
