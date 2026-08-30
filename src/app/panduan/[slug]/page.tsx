import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site/site-shell";
import { GUIDES, getGuide } from "@/lib/content/guides";
import { waUrl } from "@/lib/site";

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  return { title: guide?.title ?? "Panduan" };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  return (
    <SiteShell>
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-xs text-muted-foreground">{guide.date}</p>
        <h1 className="mt-2 font-heading text-4xl text-balance">{guide.title}</h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">{guide.excerpt}</p>
        <div className="mt-10 space-y-8">
          {guide.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-heading text-2xl">{section.heading}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} className="mt-3 leading-7 text-muted-foreground">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap gap-3">
          <a
            href={waUrl()}
            className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
          >
            Konsultasi via WhatsApp
          </a>
          <Link
            href="/panduan"
            className="inline-flex h-10 items-center rounded-full border border-border px-5 text-sm"
          >
            Semua panduan
          </Link>
        </div>
      </article>
    </SiteShell>
  );
}
