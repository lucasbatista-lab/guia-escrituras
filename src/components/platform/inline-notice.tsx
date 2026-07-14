import { cn } from "@/lib/utils";

export function InlineNotice({
  children,
  tone = "info",
  className,
  live = true,
}: {
  children: React.ReactNode;
  tone?: "info" | "error" | "success";
  className?: string;
  live?: boolean;
}) {
  const role = tone === "error" ? "alert" : "status";
  return (
    <p
      role={role}
      aria-live={live ? (tone === "error" ? "assertive" : "polite") : undefined}
      className={cn(
        "rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
        tone === "error" && "bg-destructive/10 text-destructive",
        tone === "success" && "bg-gold/10 text-ink",
        tone === "info" && "bg-sand-200/60 text-ink-soft",
        className,
      )}
    >
      {children}
    </p>
  );
}
