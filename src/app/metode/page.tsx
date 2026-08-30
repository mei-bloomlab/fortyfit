import type { Metadata } from "next";
import { SiteShell } from "@/components/site/site-shell";
import { SITE, waUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Metode",
};

export default function MetodePage() {
  return (
    <SiteShell>
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">
          Metode
        </p>
        <h1 className="mt-3 font-heading text-4xl text-balance">
          Teknik dulu, beban belakangan
        </h1>
        <div className="mt-8 space-y-5 leading-7 text-muted-foreground">
          <p>
            FortyFit khusus pemula di {SITE.city}. Sesi private 1-on-1 supaya
            kamu tidak perlu merasa dinilai di gym ramai.
          </p>
          <p>
            Setiap sesi punya fokus. Gerakan dicatat. Progressive overload
            dilakukan pelan: naik repetisi, set, atau beban hanya kalau teknik
            sudah aman.
          </p>
          <p>
            Jadwal dan progress dicatat coach di aplikasi studio yang terpisah.
            Kamu cukup datang, latihan, dan chat WhatsApp kalau ada yang mau
            ditanya.
          </p>
        </div>
        <a
          href={waUrl()}
          className="mt-10 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
        >
          Konsultasi via WhatsApp
        </a>
      </article>
    </SiteShell>
  );
}
