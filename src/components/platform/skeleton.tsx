import { cn } from "@/lib/utils";

export function PlatformSkeleton({
  className,
  lines = 3,
}: {
  className?: string;
  lines?: number;
}) {
  return (
    <div
      className={cn("space-y-4", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Carregando…</span>
      <div className="h-8 w-2/5 max-w-xs animate-soft-pulse rounded-lg bg-sand-200/80" />
      <div className="h-4 w-3/4 max-w-md animate-soft-pulse rounded bg-sand-200/60" />
      <div className="space-y-3 pt-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-soft-pulse rounded-2xl border border-border/50 bg-card/50"
          />
        ))}
      </div>
    </div>
  );
}
