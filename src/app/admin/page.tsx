import {
  AdminMetricsError,
  formatRevenueBrl,
  getAdminOverviewMetrics,
} from "@/lib/admin/metrics";
import { formatPriceBRL } from "@/lib/entitlements";
import { StripeReadinessPanel } from "@/components/admin/stripe-readiness-panel";

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
          Dados reais do banco. Sem conteúdo de conversas. Métricas de IA são
          estimativas (não fatura do provedor). Atualizado em{" "}
          {new Date(metrics.generatedAt).toLocaleString("pt-BR")}.
        </p>
        {metrics.aiMetricsPartial ? (
          <p className="mt-2 text-sm text-amber-800">
            Atenção: agregados de IA atingiram o limite de páginas e podem estar
            parciais.
          </p>
        ) : null}
      </div>

      <Section title="Prontidão de pagamentos">
        <StripeReadinessPanel />
      </Section>

      <Section title="Usuários">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Usuários totais" value={String(metrics.totalUsers)} />
          <Metric label="Novos hoje" value={String(metrics.newUsersToday)} />
          <Metric label="Novos (7 dias)" value={String(metrics.newUsers7d)} />
          <Metric label="Novos (30 dias)" value={String(metrics.newUsers30d)} />
        </div>
      </Section>

      <Section title="Assinaturas (efetivas)">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Assinantes efetivos"
            value={String(metrics.activeSubscriberUsers)}
          />
          <Metric
            label="MRR estimado pelo catálogo"
            value={formatPriceBRL(metrics.mrrCatalogBrlCents)}
            hint="Não é receita recebida da Stripe."
          />
          <Metric
            label="Receita real recebida"
            value={formatRevenueBrl(metrics.realRevenueBrlCents)}
            hint="Ainda não integrada ao painel."
          />
          <Metric
            label="Assinaturas past_due"
            value={String(metrics.pastDueSubscriptions)}
          />
          <Metric
            label="Usuários com assinaturas ativas duplicadas"
            value={String(metrics.usersWithDuplicateSubscriptions)}
          />
        </div>
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
      </Section>

      <Section title="Checkout e pagamento">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Checkouts iniciados"
            value={String(metrics.checkoutsStarted)}
          />
          <Metric
            label="Checkouts concluídos"
            value={String(metrics.checkoutsCompleted)}
          />
          <Metric
            label="Checkouts pendentes"
            value={String(metrics.checkoutsPending)}
          />
          <Metric
            label="Pendentes/expirados ou cancelados"
            value={String(metrics.checkoutsExpiredOrCanceled)}
          />
          <Metric
            label="Checkout stuck (>30 min)"
            value={String(metrics.checkoutsStuckOver30m)}
          />
          <Metric
            label="payment_events received"
            value={String(metrics.paymentEventsReceived)}
          />
          <Metric
            label="payment_events failed"
            value={String(metrics.paymentEventsFailed)}
          />
          <Metric
            label="payment_events processed"
            value={String(metrics.paymentEventsProcessed)}
          />
        </div>
        <p className="mt-3 text-xs text-ink-soft">
          past_due, events failed, received e checkout pendente são estados
          distintos — não misturar sob “falha de pagamento”.
        </p>
      </Section>

      <Section title="IA (estimativa do provedor / planning)">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Solicitações hoje"
            value={String(metrics.aiRequestsToday)}
          />
          <Metric
            label="Solicitações (30 dias)"
            value={String(metrics.aiRequests30d)}
          />
          <Metric
            label="Tokens entrada (30d)"
            value={metrics.aiInputTokens30d.toLocaleString("pt-BR")}
          />
          <Metric
            label="Tokens saída (30d)"
            value={metrics.aiOutputTokens30d.toLocaleString("pt-BR")}
          />
          <Metric
            label="Custo estimado BRL (30d)"
            value={formatPriceBRL(metrics.aiEstimatedCostBrlCents30d)}
            hint="Estimativa interna — não é fatura OpenAI."
          />
          <Metric
            label="Custo estimado USD micros (30d)"
            value={String(metrics.aiEstimatedCostUsdMicros30d)}
          />
          <Metric
            label="Latência média (30d)"
            value={
              metrics.aiAvgLatencyMs30d == null
                ? "—"
                : `${metrics.aiAvgLatencyMs30d} ms`
            }
          />
          <Metric
            label="Erros de IA (30d)"
            value={String(metrics.aiErrors30d)}
          />
        </div>
      </Section>

      <Section title="Indicações">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Atribuídas"
            value={String(metrics.referralsAttributed)}
          />
          <Metric
            label="1ª cobrança confirmada"
            value={String(metrics.referralsFirstPayment)}
          />
          <Metric
            label="2ª cobrança confirmada"
            value={String(metrics.referralsSecondPayment)}
          />
          <Metric
            label="Recompensas pendentes"
            value={String(metrics.referralsRewardPending)}
          />
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="font-display text-xl text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 p-4">
      <p className="text-xs uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-2 font-display text-2xl text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-soft">{hint}</p> : null}
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
