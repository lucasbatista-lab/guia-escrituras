import {
  formatPriceBRL,
  getPublicCheckoutPlans,
  type PlanKey,
} from "@/lib/entitlements";
import { TrackingLink } from "@/components/marketing/tracking-link";
import { cn } from "@/lib/utils";

const COMPARE_ROWS: {
  label: string;
  values: Record<"essencial" | "caminho" | "profundo", string>;
}[] = [
  {
    label: "Para quem",
    values: {
      essencial: "Situações pontuais, quando surgir a necessidade",
      caminho: "Quem quer constância e voltar ao longo da semana",
      profundo: "Situações complexas ou uso mais intenso",
    },
  },
  {
    label: "Chat personalizado",
    values: {
      essencial: "Incluído",
      caminho: "Incluído",
      profundo: "Incluído",
    },
  },
  {
    label: "Jornadas (7 etapas)",
    values: {
      essencial: "Não incluso",
      caminho: "Incluído",
      profundo: "Incluído",
    },
  },
  {
    label: "Aprofundar sob demanda",
    values: {
      essencial: "Não incluso",
      caminho: "Não incluso",
      profundo: "Incluído",
    },
  },
  {
    label: "Espaço de uso no mês",
    values: {
      essencial: "Para uso pontual, dentro do uso justo",
      caminho: "Mais espaço para conversas frequentes",
      profundo: "Para uso mais intenso, dentro do uso justo",
    },
  },
];

const PLAN_ORDER = ["essencial", "caminho", "profundo"] as const;

/**
 * Mobile-first plan comparison — stacked details, never a horizontal table.
 */
export function PlanCompareStatic({
  className,
  hasActiveSubscription = false,
}: {
  className?: string;
  hasActiveSubscription?: boolean;
}) {
  const plans = getPublicCheckoutPlans();
  const byKey = Object.fromEntries(plans.map((p) => [p.key, p])) as Record<
    "essencial" | "caminho" | "profundo",
    (typeof plans)[number]
  >;

  return (
    <section
      className={cn("scroll-mt-24", className)}
      aria-labelledby="plan-compare-heading"
    >
      <h2
        id="plan-compare-heading"
        className="font-display text-3xl text-ink sm:text-4xl"
      >
        Comparação detalhada
      </h2>
      <p className="mt-3 max-w-2xl text-ink-soft">
        Abra cada plano para ver o que muda — legível no celular, sem tabela
        horizontal.
      </p>

      <div className="mt-8 space-y-3">
        {PLAN_ORDER.map((key) => {
          const plan = byKey[key];
          if (!plan) return null;
          return (
            <details
              key={key}
              className={cn(
                "group rounded-2xl border border-border/70 bg-card/70 px-4 open:bg-card sm:px-5",
                plan.highlighted && "border-gold/40 ring-1 ring-gold/20",
              )}
              open={key === "caminho"}
            >
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md py-4 marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                <span className="min-w-0">
                  <span className="font-display text-xl text-ink">
                    {plan.name}
                  </span>
                  <span className="mt-1 block text-sm text-ink-soft">
                    {formatPriceBRL(plan.priceMonthlyCents)}/mês
                    {plan.highlighted
                      ? " · melhor equilíbrio"
                      : key === "profundo"
                        ? " · com Aprofundar"
                        : ""}
                  </span>
                </span>
                <span
                  className="shrink-0 text-sm text-ink-soft transition group-open:rotate-180"
                  aria-hidden
                >
                  ▾
                </span>
              </summary>
              <ul className="space-y-3 border-t border-border/60 pb-5 pt-4">
                {COMPARE_ROWS.map((row) => (
                  <li key={row.label}>
                    <p className="text-xs font-medium uppercase tracking-[0.1em] text-ink-soft">
                      {row.label}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-ink">
                      {row.values[key]}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="pb-5">
                <TrackingLink
                  href={
                    hasActiveSubscription
                      ? "/conta"
                      : `/cadastro?plan=${key as PlanKey}`
                  }
                  className="inline-flex min-h-11 items-center text-sm font-medium text-ink underline underline-offset-4"
                >
                  {hasActiveSubscription
                    ? "Gerenciar assinatura"
                    : plan.ctaLabel}
                </TrackingLink>
              </p>
            </details>
          );
        })}
      </div>
    </section>
  );
}
