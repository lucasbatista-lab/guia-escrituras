import { cn } from "@/lib/utils";

/**
 * Quiet structural skeleton — geometry only, never fake spiritual content.
 */
export function PlatformSkeleton({
  className,
  lines = 3,
  variant = "default",
}: {
  className?: string;
  lines?: number;
  variant?: "default" | "hoje" | "chat";
}) {
  return (
    <div
      className={cn("space-y-4", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Carregando conteúdo…</span>
      {variant === "hoje" ? (
        <>
          <div className="h-3 w-24 animate-soft-pulse rounded bg-sand-200/70" />
          <div className="h-40 animate-soft-pulse rounded-[22px] bg-[linear-gradient(160deg,rgba(58,36,48,0.35),rgba(90,34,50,0.28))]" />
          <div className="flex gap-1.5 px-1" aria-hidden>
            {Array.from({ length: 6 }).map((_, i) => (
              <span
                key={i}
                className="h-1 flex-1 animate-soft-pulse rounded-full bg-sand-200/80"
              />
            ))}
          </div>
        </>
      ) : variant === "chat" ? (
        <>
          <div className="h-8 w-2/5 max-w-xs animate-soft-pulse rounded-lg bg-sand-200/80" />
          <div className="ml-auto h-16 w-3/4 max-w-sm animate-soft-pulse rounded-2xl bg-sand-200/50" />
          <div className="h-24 w-4/5 max-w-md animate-soft-pulse rounded-2xl border border-border/40 bg-card/40" />
        </>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
