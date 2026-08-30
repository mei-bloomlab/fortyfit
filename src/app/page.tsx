import Link from "next/link";
import { SiteShell } from "@/components/site/site-shell";
import { LeadForm } from "@/components/site/lead-form";
import { GUIDES } from "@/lib/content/guides";
import { PROGRAMS_PUBLIC, SITE, waUrl } from "@/lib/site";

export default function HomePage() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
        <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">
          {SITE.city} · 1-on-1
        </p>
        <h1 className="mt-3 max-w-3xl font-heading text-4xl leading-tight text-balance sm:text-6xl">
          Takut salah gerakan atau di-judge di gym?
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
          Latihan private untuk pemula. Nyaman, terarah, mulai dari kondisi kamu
          hari ini. Khusus area {SITE.city}.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={waUrl()}
            className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
          >
            Tanya via WhatsApp
          </a>
          <Link
            href="/program"
            className="inline-flex h-10 items-center rounded-full border border-border px-5 text-sm"
          >
            Lihat program
          </Link>
        </div>
      </section>

      <section className="border-y border-border/70 bg-card">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6">
          <div>
            <h2 className="font-heading text-3xl">Bingung mulai dari mana?</h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              Banyak pemula takut cedera, bingung pilih latihan, atau sulit
              konsisten. Di FortyFit kamu dibimbing dari dasar, realistis, tanpa
              pressure gym ramai.
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              <li>Belum tahu latihan yang cocok</li>
              <li>Takut cedera karena salah teknik</li>
              <li>Sulit konsisten olahraga</li>
              <li>Ingin turun lemak tapi butuh arahan</li>
            </ul>
          </div>
          <div className="rounded-2xl bg-secondary p-6">
            <h3 className="font-heading text-xl">Mulai dalam 3 langkah</h3>
            <ol className="mt-4 space-y-4 text-sm leading-6">
              <li>
                <strong>Chat WhatsApp.</strong> Konsultasi singkat, tidak perlu
                sudah fit.
              </li>
              <li>
                <strong>Ceritakan tujuan.</strong> Turun lemak, mulai dari nol,
                atau bangun kekuatan.
              </li>
              <li>
                <strong>Mulai latihan.</strong> Bertahap, sesuai kondisi tubuh
                kamu.
              </li>
            </ol>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <h2 className="font-heading text-3xl">Program FortyFit</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {PROGRAMS_PUBLIC.map((program) => (
            <Link
              key={program.slug}
              href="/program"
              className="rounded-2xl bg-card p-5 ring-1 ring-border transition-colors hover:bg-secondary"
            >
              <h3 className="font-heading text-xl">{program.name}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {program.summary}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-border/70 bg-card">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6">
          <div>
            <h2 className="font-heading text-3xl">Siap mulai latihan pertama?</h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              Isi singkat, lalu chat langsung ke WhatsApp FortyFit. Tidak perlu
              sudah fit.
            </p>
            <div className="mt-6">
              <LeadForm />
            </div>
          </div>
          <div>
            <h2 className="font-heading text-3xl">Baca dulu</h2>
            <div className="mt-6 space-y-3">
              {GUIDES.map((guide) => (
                <Link
                  key={guide.slug}
                  href={`/panduan/${guide.slug}`}
                  className="block rounded-2xl p-4 ring-1 ring-border hover:bg-secondary"
                >
                  <p className="font-medium">{guide.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{guide.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
