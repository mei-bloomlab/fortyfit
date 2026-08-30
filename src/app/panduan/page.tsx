import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site/site-shell";
import { GUIDES } from "@/lib/content/guides";

export const metadata: Metadata = {
  title: "Panduan",
};

export default function PanduanPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">
          Panduan
        </p>
        <h1 className="mt-3 font-heading text-4xl">Baca sebelum mulai</h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          Artikel singkat dari FortyFit. Bukan pengganti sesi, tapi biar kamu
          tidak mulai dari mitos gym.
        </p>
        <div className="mt-8 space-y-4">
          {GUIDES.map((guide) => (
            <Link
              key={guide.slug}
              href={`/panduan/${guide.slug}`}
              className="block rounded-2xl bg-card p-5 ring-1 ring-border hover:bg-secondary"
            >
              <p className="font-heading text-2xl">{guide.title}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {guide.excerpt}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}
