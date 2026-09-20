import { cn } from "@/lib/utils";

export function PresencePulse({ className }: { className?: string }) {
  return <span aria-hidden className={cn("amem-presence-pulse", className)} />;
}
