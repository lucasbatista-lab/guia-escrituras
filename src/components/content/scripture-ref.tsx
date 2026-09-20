import { cn } from "@/lib/utils";

export function ScriptureRef({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={cn("amem-scripture-ref", className)}>{children}</span>;
}
