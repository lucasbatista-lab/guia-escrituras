import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  AdminEmptyState,
  AdminKpi,
  AdminOpLink,
  AdminSection,
} from "@/components/admin/admin-primitives";
import {
  AdminMetricsError,
  getAdminAiCostMetrics,
} from "@/lib/admin";
import { formatPriceBRL } from "@/lib/entitlements";

export default async function AdminCustosPage() {
  let metrics;
  try {
    metrics = await getAdminAiCostMetrics();
  } catch (error) {
    if (error instanceof AdminMetricsError) {
      return (
        <AdminEmptyState
          tone="error"
          title="Falha ao carregar custos"
          description={error.message}
          actionHref="/admin/custos"
          actionLabel="Tentar de novo"
        />
      );
    }
    throw error;
  }

  const avgPerUser =
    metrics.totalUsers > 0
      ? Math.round(metrics.aiEstimatedCostBrlCents30d / metrics.totalUsers)
      : 0;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Receita"
        title="Custos"
        description="Estimativas internas de planejamento a partir de usage_events (30 dias). Não confundir com fatura OpenAI nem com receita Stripe."
        meta={
          metrics.aiMetricsPartial
            ? "Leitura parcial — limite de páginas atingido; totais não são completos."
            : "Todas as métricas abaixo são ESTIMADAS — não são valores de caixa."
        }
      />

      <AdminSection
        title="Estimativa de IA (30 dias)"
        description="Heurística interna — honestidade de qualidade antes de tomar decisões financeiras."
        tone="priority"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminKpi
            label="Custo estimado de IA (BRL, 30d)"
            value={formatPriceBRL(metrics.aiEstimatedCostBrlCents30d)}
            estimated
            partial={metrics.aiMetricsPartial}
          />
          <AdminKpi
            label="Custo estimado (USD micros, 30d)"
            value={metrics.aiEstimatedCostUsdMicros30d.toLocaleString("pt-BR")}
            estimated
            partial={metrics.aiMetricsPartial}
          />
          <AdminKpi
            label="Requisições de IA (30d)"
            value={metrics.aiRequests30d.toLocaleString("pt-BR")}
            partial={metrics.aiMetricsPartial}
            hint="Contagem real de eventos — o custo derivado continua estimado."
          />
          <AdminKpi
            label="Estimativa média por usuário cadastrado"
            value={formatPriceBRL(avgPerUser)}
            estimated
            partial={metrics.aiMetricsPartial}
          />
        </div>
        {metrics.aiRequests30d === 0 ? (
          <AdminEmptyState
            tone="empty"
            title="Nenhum custo de IA registrado no período"
            description="Sem usage_events de IA nos últimos 30 dias."
          />
        ) : null}
      </AdminSection>

      <AdminSection title="Receita e MRR" tone="muted">
        <p className="text-sm text-ink-soft">
          MRR e receita de assinatura ficam na visão geral — são distintos destas
          estimativas de custo.
        </p>
        <AdminOpLink href="/admin">Visão geral (receita)</AdminOpLink>
      </AdminSection>
    </div>
  );
}
