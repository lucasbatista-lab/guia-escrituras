import Link from "next/link";
import { cn } from "@/lib/utils";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
  breadcrumb,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  /** Period, data quality, or operational context line. */
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumb?: { href: string; label: string };
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 max-w-3xl">
        {breadcrumb ? (
          <Link
            href={breadcrumb.href}
            className="mb-2 inline-flex min-h-11 items-center text-sm text-ink-soft underline underline-offset-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            ← {breadcrumb.label}
          </Link>
        ) : null}
        {eyebrow ? (
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={cn(
            "font-display text-3xl tracking-tight text-ink sm:text-[2rem]",
            eyebrow || breadcrumb ? "mt-1.5" : undefined,
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            {description}
          </p>
        ) : null}
        {meta ? (
          <div className="mt-2 text-xs leading-relaxed text-ink-soft">{meta}</div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
