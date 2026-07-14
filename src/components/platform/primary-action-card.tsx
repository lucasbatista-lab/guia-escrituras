import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Dominant next-step card for authenticated surfaces. */
export function PrimaryActionCard({
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
        "relative overflow-hidden rounded-2xl border p-6 sm:p-7",
        tone === "emphasis"
          ? "border-wine/25 bg-gradient-to-br from-wine/[0.07] via-card/80 to-sand-100/80"
          : "border-border/70 bg-card/70",
        className,
      )}
    >
      {tone === "emphasis" ? (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-gold/10"
        />
      ) : null}
      <h2 className="relative font-display text-xl text-ink sm:text-2xl">
        {title}
      </h2>
      <p className="relative mt-2 max-w-xl text-sm leading-relaxed text-ink-soft sm:text-[15px]">
        {body}
      </p>
      <Button asChild className="relative mt-6 min-h-11 bg-ink hover:bg-ink/90">
        <Link href={href}>{cta}</Link>
      </Button>
    </div>
  );
}

/** @deprecated Prefer PrimaryActionCard */
export { PrimaryActionCard as PlatformActionCard };
