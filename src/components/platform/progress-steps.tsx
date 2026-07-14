import { cn } from "@/lib/utils";

export type ProgressStep = {
  label: string;
  status: "done" | "current" | "upcoming";
};

export function ProgressSteps({
  steps,
  className,
  label = "Seu progresso",
}: {
  steps: ProgressStep[];
  className?: string;
  label?: string;
}) {
  return (
    <nav aria-label={label} className={cn("w-full", className)}>
      <ol className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-0">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          return (
            <li
              key={step.label}
              className="flex min-w-0 flex-1 items-start gap-3 sm:flex-col sm:items-stretch sm:gap-0"
            >
              <div className="flex items-center gap-3 sm:w-full">
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                    step.status === "done" &&
                      "border-ink bg-ink text-sand-50",
                    step.status === "current" &&
                      "border-wine bg-wine/10 text-wine",
                    step.status === "upcoming" &&
                      "border-border bg-card text-ink-soft",
                  )}
                  aria-current={step.status === "current" ? "step" : undefined}
                >
                  {step.status === "done" ? (
                    <span aria-hidden>✓</span>
                  ) : (
                    index + 1
                  )}
                </span>
                {!isLast ? (
                  <span
                    aria-hidden
                    className={cn(
                      "hidden h-px flex-1 sm:block",
                      step.status === "done" ? "bg-ink/40" : "bg-border",
                    )}
                  />
                ) : null}
              </div>
              <p
                className={cn(
                  "pt-1 text-sm leading-snug sm:mt-2 sm:pr-3",
                  step.status === "current"
                    ? "font-medium text-ink"
                    : "text-ink-soft",
                )}
              >
                {step.label}
                <span className="sr-only">
                  {step.status === "done"
                    ? " — concluído"
                    : step.status === "current"
                      ? " — etapa atual"
                      : " — pendente"}
                </span>
              </p>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
