import { cn } from "@/lib/utils";

export function SurfaceEditorial({
  children,
  rule = "wine",
  className,
}: {
  children: React.ReactNode;
  rule?: "wine" | "gold";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "amem-surface-editorial",
        rule === "gold" && "amem-surface-editorial-gold",
        className,
      )}
    >
      {children}
    </div>
  );
}
