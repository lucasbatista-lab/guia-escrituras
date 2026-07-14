import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  className,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-border/80 bg-sand-50/50 px-5 py-10 text-center sm:px-8",
        className,
      )}
    >
      <h2 className="font-display text-xl text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
        {description}
      </p>
      {actionHref && actionLabel ? (
        <Button asChild className="mt-6 min-h-11 bg-ink hover:bg-ink/90">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}
