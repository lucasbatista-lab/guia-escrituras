import { cn } from "@/lib/utils";

export function PlanChip({
  variant,
  label,
  className,
}: {
  variant: "free" | "paid";
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1.5 text-[11px] font-bold tracking-[0.03em]",
        variant === "free"
          ? "bg-[rgba(90,34,50,0.07)] text-wine shadow-[inset_0_0_0_1px_var(--amem-hairline-wine)]"
          : "bg-[color:var(--amem-wine-deep)] text-[#F5EBD4] shadow-[inset_0_0_0_1px_rgba(184,150,90,0.35)]",
        className,
      )}
    >
      {label}
    </span>
  );
}
