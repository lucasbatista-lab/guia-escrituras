import { cn } from "@/lib/utils";

export function PlatformPageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 max-w-2xl">
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-gold">
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={cn(
            "font-display text-3xl tracking-tight text-ink sm:text-[2rem]",
            eyebrow ? "mt-2" : undefined,
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-base leading-relaxed text-ink-soft">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
