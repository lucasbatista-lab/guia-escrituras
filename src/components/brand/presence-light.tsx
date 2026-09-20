import { cn } from "@/lib/utils";

export function PresenceLight({
  size = "md",
  centered = false,
  className,
}: {
  size?: "sm" | "md" | "lg";
  centered?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "amem-presence-light",
        centered && "amem-presence-light-center",
        size === "sm" && "h-40 w-40",
        size === "lg" && "h-80 w-80",
        className,
      )}
    />
  );
}
