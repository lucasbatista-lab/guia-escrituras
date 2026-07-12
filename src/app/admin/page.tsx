import { MOCK_ADMIN_METRICS } from "@/lib/database";
import { formatPriceBRL } from "@/lib/entitlements";

export default function AdminHomePage() {
  const m = MOCK_ADMIN_METRICS;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-ink">Visão geral</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Métricas mock / queries preparadas. Nenhum conteúdo espiritual de
          usuários é exibido.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Usuários ativos" value={String(m.activeUsers)} />
        <Metric
          label="MRR estimado"
          value={formatPriceBRL(m.estimatedMrrBrlCents)}
        />
        <Metric
          label="Custo de IA"
          value={formatPriceBRL(m.aiCostBrlCents)}
        />
        <Metric
          label="Custo médio / usuário"
          value={formatPriceBRL(m.avgCostPerUserBrlCents)}
        />
      </div>

      <section>
        <h2 className="font-display text-xl text-ink">Assinantes por plano</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {m.subscribersByPlan.map((row) => (
            <li
              key={row.planKey}
              className="flex justify-between rounded-lg border border-border/60 px-3 py-2"
            >
              <span className="capitalize text-ink">{row.planKey}</span>
              <span className="text-ink-soft">{row.count}</span>
            </li>
          ))}
        </ul>
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
