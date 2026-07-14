import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Compact action-oriented card for authenticated home / empty states. */
export function PlatformActionCard({
  title,
  body,
  href,
  cta,
  tone = "default",
  className,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
  tone?: "default" | "emphasis";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-6",
        tone === "emphasis"
          ? "border-wine/30 bg-wine/5"
          : "border-border/70 bg-card/60",
        className,
      )}
    >
      <h2 className="font-display text-xl text-ink">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
      <Button asChild className="mt-5 min-h-11 bg-ink hover:bg-ink/90">
        <Link href={href}>{cta}</Link>
      </Button>
    </div>
  );
}
