import { cn } from "@/lib/utils";

/** Compact lock affordance — copy + context, not gold-alone. */
export function LockPill({
  label = "Planos",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border/80 bg-card/90 px-2.5 text-xs font-medium text-ink-soft",
        className,
      )}
    >
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: "var(--amem-gold-500, #C6A05A)" }}
      />
      {label}
    </span>
  );
}
