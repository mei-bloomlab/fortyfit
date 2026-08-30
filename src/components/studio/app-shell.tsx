"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarClock,
  CalendarDays,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Hari ini", icon: LayoutDashboard, exact: true },
  { href: "/admin/customers", label: "Customer", icon: Users },
  { href: "/admin/jadwal", label: "Atur Jadwal", icon: CalendarClock },
  { href: "/admin/calendar", label: "Kalender", icon: CalendarDays },
  { href: "/admin/reminders", label: "Reminder WA", icon: Bell },
  { href: "/admin/setting", label: "Setting", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1400px]">
        <aside className="hidden w-64 shrink-0 border-r border-border/70 bg-sidebar px-4 py-6 md:flex md:flex-col">
          <Brand />
          <nav className="mt-8 flex flex-col gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isActive(pathname, item)}
              />
            ))}
          </nav>
          <p className="mt-auto pt-8 text-xs leading-5 text-muted-foreground">
            Admin FortyFit
            <br />
            Tabanan · WITA
            <br />
            <Link href="/" className="mt-2 inline-block text-primary hover:underline">
              Lihat situs publik
            </Link>
          </p>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-border/70 md:hidden">
            <div className="flex items-center px-4 py-3">
              <Brand compact />
            </div>
            <nav className="flex gap-1 overflow-x-auto px-3 pb-3">
              {NAV.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  compact
                  active={isActive(pathname, item)}
                />
              ))}
            </nav>
          </header>
          <main className="flex-1 px-4 py-6 sm:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

function isActive(
  pathname: string,
  item: { href: string; exact?: boolean; aliases?: string[] },
) {
  if (item.exact) return pathname === item.href;
  if (pathname.startsWith(item.href)) return true;
  return (item.aliases ?? []).some((alias) => pathname.startsWith(alias));
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/admin" className="flex items-center gap-3">
      <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
        40
      </span>
      {compact ? (
        <span className="font-heading text-base font-medium">FortyFit Admin</span>
      ) : (
        <span>
          <span className="block font-heading text-base font-medium">
            FortyFit Admin
          </span>
          <span className="block text-xs text-muted-foreground">
            Studio admin
          </span>
        </span>
      )}
    </Link>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  compact = false,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
        compact && "px-2",
        active
          ? "bg-sidebar-accent text-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}
