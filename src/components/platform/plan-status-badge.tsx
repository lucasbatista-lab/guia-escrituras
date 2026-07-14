import { cn } from "@/lib/utils";

export function PlanStatusBadge({
  label,
  tone = "neutral",
  className,
}: {
  label: string;
  tone?: "neutral" | "active" | "attention";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium",
        tone === "active" && "bg-gold/15 text-ink",
        tone === "attention" && "bg-wine/10 text-wine",
        tone === "neutral" && "bg-sand-200/80 text-ink-soft",
        className,
      )}
    >
      {label}
    </span>
  );
}
