import {
  AdminMetricsError,
  getAdminOverviewMetrics,
} from "@/lib/admin/metrics";
import { formatPriceBRL } from "@/lib/entitlements";

export default async function AdminCustosPage() {
  let metrics;
  try {
    metrics = await getAdminOverviewMetrics();
  } catch (error) {
    if (error instanceof AdminMetricsError) {
      return <p className="text-sm text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const avgPerUser =
    metrics.totalUsers > 0
      ? Math.round(metrics.aiCostBrlCents / metrics.totalUsers)
      : 0;

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Custos</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Estimativas a partir de usage_events — nunca calculadas pela IA.
      </p>
      <ul className="mt-8 space-y-3 text-sm">
        <li className="flex justify-between border-b border-border/50 py-3">
          <span>Custo de IA (BRL)</span>
          <span>{formatPriceBRL(metrics.aiCostBrlCents)}</span>
        </li>
        <li className="flex justify-between border-b border-border/50 py-3">
          <span>Custo de IA (USD micros)</span>
          <span>{metrics.aiCostUsdMicros.toLocaleString("pt-BR")}</span>
        </li>
        <li className="flex justify-between border-b border-border/50 py-3">
          <span>Custo médio por usuário</span>
          <span>{formatPriceBRL(avgPerUser)}</span>
        </li>
        <li className="flex justify-between border-b border-border/50 py-3">
          <span>MRR (assinaturas ativas)</span>
          <span>{formatPriceBRL(metrics.mrrBrlCents)}</span>
        </li>
      </ul>
      {metrics.aiRequests === 0 && (
        <p className="mt-6 text-sm text-ink-soft">Nenhum custo de IA registrado.</p>
      )}
    </div>
  );
}
