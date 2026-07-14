import { cn } from "@/lib/utils";

export function StatusCard({
  title,
  body,
  tone = "info",
  children,
  className,
}: {
  title: string;
  body: string;
  tone?: "info" | "warning" | "success";
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "rounded-2xl border p-5 sm:p-6",
        tone === "warning" && "border-wine/30 bg-wine/[0.06]",
        tone === "success" && "border-gold/35 bg-gold/[0.08]",
        tone === "info" && "border-border/70 bg-card/70",
        className,
      )}
    >
      <h2 className="font-display text-xl text-ink">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
