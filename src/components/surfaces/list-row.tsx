import { cn } from "@/lib/utils";

export function ListRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("amem-list-row", className)}>{children}</div>;
}
