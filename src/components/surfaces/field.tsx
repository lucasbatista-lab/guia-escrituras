import { cn } from "@/lib/utils";

export function SurfaceField({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("amem-surface-field p-4", className)}>{children}</div>;
}
