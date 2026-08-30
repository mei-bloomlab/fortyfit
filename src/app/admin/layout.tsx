import type { Metadata } from "next";
import { AppShell } from "@/components/studio/app-shell";

export const metadata: Metadata = {
  title: "FortyFit Admin",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-full bg-background text-foreground">
      <AppShell>{children}</AppShell>
    </div>
  );
}
