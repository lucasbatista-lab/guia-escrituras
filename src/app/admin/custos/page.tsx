import { MOCK_ADMIN_METRICS } from "@/lib/database";
import { formatPriceBRL } from "@/lib/entitlements";

export default function AdminCustosPage() {
  const m = MOCK_ADMIN_METRICS;
  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Custos</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Estimativas determinísticas a partir de tokens — nunca calculadas pela
        IA.
      </p>
      <ul className="mt-8 space-y-3 text-sm">
        <li className="flex justify-between border-b border-border/50 py-3">
          <span>Custo de IA (período mock)</span>
          <span>{formatPriceBRL(m.aiCostBrlCents)}</span>
        </li>
        <li className="flex justify-between border-b border-border/50 py-3">
          <span>Custo médio por usuário ativo</span>
          <span>{formatPriceBRL(m.avgCostPerUserBrlCents)}</span>
        </li>
        <li className="flex justify-between border-b border-border/50 py-3">
          <span>MRR estimado</span>
          <span>{formatPriceBRL(m.estimatedMrrBrlCents)}</span>
        </li>
      </ul>
    </div>
  );
}
