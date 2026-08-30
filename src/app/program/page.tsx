import type { Metadata } from "next";
import { SiteShell } from "@/components/site/site-shell";
import { PROGRAMS_PUBLIC, waUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Program",
};

export default function ProgramPage() {
  return (
    <SiteShell>
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">
          Program
        </p>
        <h1 className="mt-3 font-heading text-4xl text-balance">
          Tiga jalur, satu cara kerja: 1-on-1 dan bertahap
        </h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          Paket sesi dibicarakan saat konsultasi. Yang dipilih di sini adalah
          arah latihan, bukan harga di website.
        </p>
        <div className="mt-10 space-y-6">
          {PROGRAMS_PUBLIC.map((program) => (
            <section key={program.slug} className="rounded-2xl bg-card p-6 ring-1 ring-border">
              <h2 className="font-heading text-2xl">{program.name}</h2>
              <p className="mt-2 leading-7 text-muted-foreground">{program.summary}</p>
            </section>
          ))}
        </div>
        <a
          href={waUrl("Halo FortyFit, saya ingin tanya program yang cocok.")}
          className="mt-10 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
        >
          Tanya program via WhatsApp
        </a>
      </article>
    </SiteShell>
  );
}
