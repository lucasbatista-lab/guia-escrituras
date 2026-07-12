import { MOCK_ADMIN_METRICS } from "@/lib/database";

export default function AdminUsoPage() {
  const p = MOCK_ADMIN_METRICS.usagePercentiles;
  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Uso</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Percentis de requisições (agregados). Sem conteúdo de conversas.
      </p>
      <dl className="mt-8 grid max-w-md gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border/60 p-4">
          <dt className="text-xs text-ink-soft">p50</dt>
          <dd className="font-display text-2xl text-ink">{p.p50}</dd>
        </div>
        <div className="rounded-xl border border-border/60 p-4">
          <dt className="text-xs text-ink-soft">p90</dt>
          <dd className="font-display text-2xl text-ink">{p.p90}</dd>
        </div>
        <div className="rounded-xl border border-border/60 p-4">
          <dt className="text-xs text-ink-soft">p99</dt>
          <dd className="font-display text-2xl text-ink">{p.p99}</dd>
        </div>
      </dl>
    </div>
  );
}
