import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  AdminEmptyState,
  AdminKpi,
  AdminOpLink,
  AdminSection,
} from "@/components/admin/admin-primitives";
import {
  AdminMetricsError,
  getAdminUsageMetrics,
} from "@/lib/admin/metrics";

export default async function AdminUsoPage() {
  let usage;
  try {
    usage = await getAdminUsageMetrics();
  } catch (error) {
    if (error instanceof AdminMetricsError) {
      return (
        <AdminEmptyState
          tone="error"
          title="Falha ao carregar uso"
          description={error.message}
          actionHref="/admin/uso"
          actionLabel="Tentar de novo"
        />
      );
    }
    throw error;
  }

  const p = usage.usagePercentiles;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Assinantes e produto"
        title="Uso"
        description="Percentis de requisições mensais (agregados reais em usage_monthly). Sem conteúdo de conversas."
        meta={
          usage.partial
            ? "Leitura parcial — limite de páginas atingido."
            : "Dados reais de uso agregado — distinto de custo estimado de IA."
        }
      />

      <AdminSection
        title="Volume real de requisições"
        description="Soma mensal registrada — não é estimativa de custo nem fatura do provedor."
        tone="priority"
      >
        <AdminKpi
          label="Total de requisições (soma mensal)"
          value={String(usage.totalRequests)}
          partial={usage.partial}
          hint="Fonte: usage_monthly. Para custo estimado de IA, veja Custos."
        />
        {usage.totalRequests === 0 ? (
          <AdminEmptyState
            tone="empty"
            title="Nenhum uso registrado ainda"
            description="Quando assinantes consumirem turnos, os percentis aparecem abaixo."
          />
        ) : (
          <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
            <AdminKpi label="p50" value={String(p.p50)} compact partial={usage.partial} />
            <AdminKpi label="p90" value={String(p.p90)} compact partial={usage.partial} />
            <AdminKpi label="p99" value={String(p.p99)} compact partial={usage.partial} />
          </div>
        )}
      </AdminSection>

      <AdminSection
        title="Custo estimado de IA"
        description="Planejamento interno — não confundir com este painel de uso real."
        tone="muted"
      >
        <p className="text-sm text-ink-soft">
          Custos em BRL/USD derivam de usage_events com heurística interna. São
          estimativas operacionais, não fatura OpenAI nem receita Stripe.
        </p>
        <AdminOpLink href="/admin/custos">Abrir Custos (estimado)</AdminOpLink>
      </AdminSection>
    </div>
  );
}
