import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Compact app chrome header — not a CMS toolbar.
 * Title dominates; eyebrow/context and subtitle stay quiet.
 */
export function AppScreenHeader({
  eyebrow,
  title,
  subtitle,
  status,
  trailing,
  backHref,
  backLabel = "Voltar",
  closeHref,
  className,
  titleAs = "h1",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  status?: React.ReactNode;
  trailing?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  closeHref?: string;
  className?: string;
  titleAs?: "h1" | "h2";
}) {
  const TitleTag = titleAs;

  return (
    <header
      className={cn(
        "relative z-10 flex items-end justify-between gap-3",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {backHref || closeHref ? (
          <div className="mb-2 flex items-center gap-2">
            {backHref ? (
              <Link
                href={backHref}
                className="inline-flex min-h-9 items-center text-sm font-medium text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                ← {backLabel}
              </Link>
            ) : null}
            {closeHref ? (
              <Link
                href={closeHref}
                className="inline-flex min-h-9 items-center text-sm text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Fechar"
              >
                Fechar
              </Link>
            ) : null}
          </div>
        ) : null}
        {eyebrow ? (
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-wine">
            {eyebrow}
          </p>
        ) : null}
        <TitleTag
          className={cn(
            "font-sans text-[28px] font-bold tracking-[-0.035em] text-ink sm:text-[30px]",
            eyebrow ? "mt-1" : undefined,
          )}
        >
          {title}
        </TitleTag>
        {subtitle ? (
          <p className="mt-1 max-w-xl text-sm leading-snug text-[color:var(--amem-mute)]">
            {subtitle}
          </p>
        ) : null}
        {status ? <div className="mt-1.5">{status}</div> : null}
      </div>
      {trailing ? (
        <div className="flex shrink-0 items-center gap-2 pb-0.5">{trailing}</div>
      ) : null}
    </header>
  );
}
