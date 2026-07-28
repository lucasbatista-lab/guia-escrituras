import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  AdminEmptyState,
  AdminExternalToolLink,
  AdminFilterSummary,
  AdminOpLink,
  AdminSection,
} from "@/components/admin/admin-primitives";
import {
  AdminMetricsError,
  getAdminPaymentEvents,
  paymentProcessingStatusHumanLabelPt,
  paymentProcessingStatusLabelPt,
  PAYMENT_EVENT_AMBIGUOUS_LABEL,
  PAYMENT_EVENT_UNCORRELATED_LABEL,
  STRIPE_DASHBOARD_EXTERNAL_LABEL,
  type AdminPaymentEventFilter,
} from "@/lib/admin";
import { cn } from "@/lib/utils";

function parseFilter(value: string | undefined): AdminPaymentEventFilter {
  if (
    value === "failed" ||
    value === "received" ||
    value === "received_stuck" ||
    value === "processed"
  ) {
    return value;
  }
  return "any";
}

function eventLevel(
  processingStatus: string,
  isStuck: boolean,
): "critical" | "attention" | "info" {
  if (processingStatus === "failed") return "critical";
  if (processingStatus === "received" && isStuck) return "attention";
  return "info";
}

const LEVEL_LABEL = {
  critical: "Crítico",
  attention: "Atenção",
  info: "Normal",
} as const;

export default async function AdminEventosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const filter = parseFilter(params.status);

  let rows;
  try {
    rows = await getAdminPaymentEvents({ filter, limit: 50 });
  } catch (error) {
    if (error instanceof AdminMetricsError) {
      return (
        <AdminEmptyState
          tone="error"
          title="Falha ao carregar eventos"
          description={error.message}
          actionHref="/admin/eventos"
          actionLabel="Tentar de novo"
        />
      );
    }
    throw error;
  }

  const filters: Array<{ key: AdminPaymentEventFilter; label: string }> = [
    { key: "any", label: "Todos" },
    { key: "failed", label: "Failed" },
    { key: "received_stuck", label: "Received presos (>3 min)" },
    { key: "received", label: "Received" },
    { key: "processed", label: "Processed" },
  ];

  const activeFilterLabel =
    filters.find((item) => item.key === filter)?.label ?? "Todos";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Receita"
        title="Eventos de pagamento"
        description="Estados do webhook. Sem payload bruto, sem secrets e sem conteúdo de conversas. IDs Stripe seguem mascarados; o link do Dashboard é montado no servidor a partir do id completo."
        meta={`Atualizado em ${new Date().toLocaleString("pt-BR")}. Últimos 50 eventos.`}
      />

      <div className="flex flex-wrap gap-2 text-sm">
        {filters.map((item) => {
          const href =
            item.key === "any"
              ? "/admin/eventos"
              : `/admin/eventos?status=${item.key}`;
          const active = filter === item.key;
          return (
            <Link
              key={item.key}
              href={href}
              className={
                active
                  ? "rounded-md bg-ink px-3 py-1.5 text-sand-50"
                  : "rounded-md border border-border/70 px-3 py-1.5 text-ink hover:bg-sand-50"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <AdminFilterSummary
        items={[{ label: "Status", value: activeFilterLabel }]}
        clearHref={filter === "any" ? undefined : "/admin/eventos"}
        resultCount={rows.length}
      />

      <AdminSection
        title="Lista de eventos"
        description="Failed e received presos aparecem destacados. Correlacionar usuário antes de abrir o Stripe."
      >
        {rows.length === 0 ? (
          <AdminEmptyState
            tone="filtered"
            title="Nenhum evento neste filtro"
            description="Tente outro status ou volte para todos os eventos."
            actionHref="/admin/eventos"
            actionLabel="Limpar filtro"
          />
        ) : (
          <ul className="space-y-2 text-sm">
            {rows.map((row) => {
              const level = eventLevel(row.processingStatus, row.isStuck);
              const humanStatus = paymentProcessingStatusHumanLabelPt(
                row.processingStatus,
                row.isStuck,
              );
              const technicalStatus = paymentProcessingStatusLabelPt(
                row.processingStatus,
              );

              return (
                <li
                  key={row.id}
                  className={cn(
                    "rounded-xl border px-3 py-3",
                    level === "critical" &&
                      "border-red-700/40 bg-red-50/80 text-red-950",
                    level === "attention" &&
                      "border-amber-700/40 bg-amber-50/80 text-amber-950",
                    level === "info" && "border-border/60 bg-card/50",
                  )}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            level === "critical" &&
                              "border-red-800/40 bg-red-100 text-red-950",
                            level === "attention" &&
                              "border-amber-800/40 bg-amber-100 text-amber-950",
                            level === "info" &&
                              "border-border bg-sand-50 text-ink",
                          )}
                        >
                          {LEVEL_LABEL[level]}
                        </span>
                        <span className="font-medium text-ink">
                          {humanStatus}
                        </span>
                        <span className="rounded-md border border-border/70 bg-card px-2 py-0.5 font-mono text-[11px] text-ink-soft">
                          {row.eventType || "evento"}
                        </span>
                      </div>

                      <p className="text-xs text-ink-soft">
                        Status técnico: {technicalStatus}
                        {row.objectIdMasked ? ` · ${row.objectIdMasked}` : ""}
                      </p>

                      <div className="flex flex-wrap items-center gap-2">
                        {row.correlationAmbiguous ? (
                          <span className="rounded-md border border-amber-700/40 bg-amber-50 px-2 py-1 text-xs text-amber-950">
                            {PAYMENT_EVENT_AMBIGUOUS_LABEL}
                          </span>
                        ) : row.correlatedUserId ? (
                          <AdminOpLink
                            href={`/admin/usuarios/${row.correlatedUserId}`}
                            className="text-xs"
                          >
                            Ver assinante correlacionado
                          </AdminOpLink>
                        ) : (
                          <span className="text-xs text-ink-soft">
                            {PAYMENT_EVENT_UNCORRELATED_LABEL}
                          </span>
                        )}
                        {row.stripeDashboardHref ? (
                          <AdminExternalToolLink href={row.stripeDashboardHref}>
                            {STRIPE_DASHBOARD_EXTERNAL_LABEL}
                          </AdminExternalToolLink>
                        ) : null}
                      </div>
                    </div>

                    <div className="shrink-0 space-y-1 text-xs text-ink-soft sm:text-right">
                      <p>
                        <span className="font-medium text-ink">Criado:</span>{" "}
                        {new Date(row.createdAt).toLocaleString("pt-BR")}
                      </p>
                      <p>
                        <span className="font-medium text-ink">Atualizado:</span>{" "}
                        {new Date(row.updatedAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </AdminSection>
    </div>
  );
}
