import { cn } from "@/lib/utils";

export function PaperGrain({
  opacity,
  className,
}: {
  opacity?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn("amem-paper-grain", className)}
      style={opacity != null ? { opacity } : undefined}
    />
  );
}
