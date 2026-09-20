import { cn } from "@/lib/utils";

export function RitualMarker({
  tone = "gold",
  pulse = false,
  className,
}: {
  tone?: "gold" | "wine";
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        pulse ? "amem-presence-pulse" : "amem-ritual-marker",
        !pulse && tone === "wine" && "amem-ritual-marker-wine",
        className,
      )}
    />
  );
}
