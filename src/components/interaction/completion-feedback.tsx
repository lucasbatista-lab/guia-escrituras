import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Quiet completion beat — no confetti; title reveals after material settle. */
export function CompletionFeedback({
  title,
  support,
  children,
  className,
  headingId,
}: {
  title: string;
  support?: string;
  children?: ReactNode;
  className?: string;
  headingId?: string;
}) {
  return (
    <div
      className={cn("amem-complete-beat flex flex-col items-center text-center", className)}
      data-amem-complete="true"
    >
      <div className="amem-complete-material" aria-hidden>
        <span className="amem-ink-sig w-10" />
      </div>
      <h2
        id={headingId}
        className="amem-complete-title amem-type-moment mt-5 font-display text-[26px] font-semibold leading-tight text-ink"
      >
        {title}
      </h2>
      {support ? (
        <p className="amem-complete-support mt-3 text-[15px] leading-relaxed text-ink-soft">
          {support}
        </p>
      ) : null}
      {children ? (
        <div className="amem-complete-actions mt-5 w-full">{children}</div>
      ) : null}
    </div>
  );
}
