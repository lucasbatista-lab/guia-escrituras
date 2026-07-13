import {
  AdminMetricsError,
  getAdminOverviewMetrics,
} from "@/lib/admin/metrics";
import { formatPriceBRL } from "@/lib/entitlements";

export default async function AdminHomePage() {
  let metrics;
  try {
    metrics = await getAdminOverviewMetrics();
  } catch (error) {
    if (error instanceof AdminMetricsError) {
      return <AdminError message={error.message} />;
    }
    throw error;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-ink">Visão geral</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Dados reais do banco. Nenhum conteúdo espiritual ou mensagem de conversa
          é exibido.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Usuários totais" value={String(metrics.totalUsers)} />
        <Metric label="Novos (7 dias)" value={String(metrics.newUsers7d)} />
        <Metric label="Novos (30 dias)" value={String(metrics.newUsers30d)} />
        <Metric label="MRR" value={formatPriceBRL(metrics.mrrBrlCents)} />
        <Metric label="Checkouts pendentes" value={String(metrics.pendingCheckouts)} />
        <Metric label="Falhas de pagamento" value={String(metrics.paymentFailures)} />
        <Metric label="Requisições de IA" value={String(metrics.aiRequests)} />
        <Metric label="Custo de IA (BRL)" value={formatPriceBRL(metrics.aiCostBrlCents)} />
        <Metric label="Erros de IA" value={String(metrics.aiErrors)} />
        <Metric
          label="Indicações atribuídas"
          value={String(metrics.referralsAttributed)}
        />
        <Metric
          label="Primeiras cobranças"
          value={String(metrics.referralsFirstPayment)}
        />
        <Metric
          label="Segundas cobranças"
          value={String(metrics.referralsSecondPayment)}
        />
        <Metric
          label="Recompensas pendentes"
          value={String(metrics.referralsRewardPending)}
        />
      </div>

      <section>
        <h2 className="font-display text-xl text-ink">Assinaturas ativas por plano</h2>
        {metrics.subscribersByPlan.every((r) => r.count === 0) ? (
          <p className="mt-4 text-sm text-ink-soft">Nenhuma assinatura ativa ainda.</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {metrics.subscribersByPlan.map((row) => (
              <li
                key={row.planKey}
                className="flex justify-between rounded-lg border border-border/60 px-3 py-2"
              >
                <span className="capitalize text-ink">{row.planKey}</span>
                <span className="text-ink-soft">{row.count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 p-4">
      <p className="text-xs uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-2 font-display text-2xl text-ink">{value}</p>
    </div>
  );
}

function AdminError({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}
