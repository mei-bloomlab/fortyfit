import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ActionPanel({
  label,
  title,
  description,
  variant = "default",
  size = "default",
  defaultOpen = false,
  children,
}: {
  label: string;
  title: string;
  description?: string;
  variant?: "default" | "outline" | "destructive";
  size?: "default" | "sm";
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="w-full" {...(defaultOpen ? { open: true } : {})}>
      <summary
        className={cn(
          buttonVariants({ variant, size }),
          "w-fit cursor-pointer list-none [&::-webkit-details-marker]:hidden",
        )}
      >
        {label}
      </summary>
      <div className="mt-3 w-full max-w-xl rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10">
        <p className="font-heading text-base font-medium">{title}</p>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
        <div className="mt-3">{children}</div>
      </div>
    </details>
  );
}
