import Link from "next/link";
import { SITE, waUrl } from "@/lib/site";

const NAV = [
  { href: "/program", label: "Program" },
  { href: "/metode", label: "Metode" },
  { href: "/panduan", label: "Panduan" },
];

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              40
            </span>
            <span>
              <span className="block font-heading text-lg leading-none">
                {SITE.name}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {SITE.city}
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 overflow-x-auto text-sm sm:gap-2">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 rounded-full px-2.5 py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            <a
              href={waUrl()}
              className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground sm:text-sm"
            >
              Chat WA
            </a>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border/80">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            {SITE.name} · personal training pemula · {SITE.city}
          </p>
          <a href={waUrl()} className="hover:text-foreground">
            WhatsApp
          </a>
        </div>
      </footer>
    </div>
  );
}
