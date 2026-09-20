import { cn } from "@/lib/utils";

/**
 * Premium signal independent of gold-as-CTA.
 * Gold remains an editorial/spiritual accent elsewhere.
 */
export function PremiumBadge({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
        className,
      )}
      style={{
        background: "var(--amem-premium-badge-bg, #2C241C)",
        color: "var(--amem-premium-badge-fg, #E0C48A)",
      }}
    >
      {label}
    </span>
  );
}
