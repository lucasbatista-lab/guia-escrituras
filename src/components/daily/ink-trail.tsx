import { cn } from "@/lib/utils";

export type InkTrailNodeState = "done" | "now" | "next" | "future";

export function InkTrail({
  total = 6,
  currentIndex,
  complete = false,
  className,
  "aria-label": ariaLabel = "Trilho de presença",
}: {
  total?: number;
  /** 0-based index of the current step. Ignored when complete. */
  currentIndex: number;
  complete?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const nodes: InkTrailNodeState[] = Array.from({ length: total }, (_, i) => {
    if (complete) return "done";
    if (i < currentIndex) return "done";
    if (i === currentIndex) return "now";
    if (i === currentIndex + 1) return "next";
    return "future";
  });

  const fillPct = complete
    ? 100
    : total <= 1
      ? 0
      : Math.max(0, Math.min(100, (currentIndex / (total - 1)) * 100));

  return (
    <div
      className={cn("amem-ink-trail", className)}
      role="img"
      aria-label={
        complete
          ? `${ariaLabel}: completo`
          : `${ariaLabel}: passo ${currentIndex + 1} de ${total}`
      }
      data-amem-trilho={complete ? "complete" : "mid"}
    >
      <div className="amem-ink-trail-track">
        <i className="amem-ink-trail-fill" style={{ width: `${fillPct}%` }} />
      </div>
      <div className="amem-ink-trail-nodes">
        {nodes.map((state, i) => (
          <span
            key={i}
            className="amem-ink-trail-node"
            data-state={state}
          />
        ))}
      </div>
    </div>
  );
}
