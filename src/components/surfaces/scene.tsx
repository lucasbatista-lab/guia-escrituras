import { cn } from "@/lib/utils";

export function SurfaceScene({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("amem-surface-scene p-5", className)}>{children}</div>;
}
