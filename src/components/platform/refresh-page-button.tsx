"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/** Client refresh for server-rendered error recoveries (e.g. /conversas). */
export function RefreshPageButton({
  label = "Tentar novamente",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  return (
    <Button
      type="button"
      className={className ?? "min-h-11 bg-ink hover:bg-ink/90"}
      onClick={() => router.refresh()}
    >
      {label}
    </Button>
  );
}
