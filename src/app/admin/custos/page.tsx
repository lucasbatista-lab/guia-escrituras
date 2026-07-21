import Link from "next/link";
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
      return <p className="text-sm text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const avgPerUser =
    metrics.totalUsers > 0
      ? Math.round(metrics.aiEstimatedCostBrlCents30d / metrics.totalUsers)
      : 0;

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Custos</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Estimativas internas de planejamento a partir de usage_events (30 dias).
        Não confundir com fatura OpenAI nem com receita Stripe.
      </p>
      {metrics.aiMetricsPartial ? (
        <p className="mt-2 text-sm text-amber-800">
          Agregação parcial: limite de páginas atingido.
        </p>
      ) : null}
      <ul className="mt-8 space-y-3 text-sm">
        <li className="flex justify-between border-b border-border/50 py-3">
          <span>Custo estimado de IA (BRL, 30d)</span>
          <span>{formatPriceBRL(metrics.aiEstimatedCostBrlCents30d)}</span>
        </li>
        <li className="flex justify-between border-b border-border/50 py-3">
          <span>Custo estimado (USD micros, 30d)</span>
          <span>
            {metrics.aiEstimatedCostUsdMicros30d.toLocaleString("pt-BR")}
          </span>
        </li>
        <li className="flex justify-between border-b border-border/50 py-3">
          <span>Requisições de IA (30d)</span>
          <span>{metrics.aiRequests30d.toLocaleString("pt-BR")}</span>
        </li>
        <li className="flex justify-between border-b border-border/50 py-3">
          <span>Estimativa média por usuário cadastrado</span>
          <span>{formatPriceBRL(avgPerUser)}</span>
        </li>
      </ul>
      <p className="mt-6 text-sm text-ink-soft">
        MRR e receita de assinatura ficam na{" "}
        <Link
          href="/admin"
          className="underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          visão geral
        </Link>
        .
      </p>
      {metrics.aiRequests30d === 0 && (
        <p className="mt-4 text-sm text-ink-soft">
          Nenhum custo de IA registrado no período.
        </p>
      )}
    </div>
  );
}
