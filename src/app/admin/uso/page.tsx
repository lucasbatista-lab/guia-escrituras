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
      return <p className="text-sm text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const p = usage.usagePercentiles;

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Uso</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Percentis de requisições mensais (agregados). Sem conteúdo de conversas.
      </p>
      {usage.partial ? (
        <p className="mt-2 text-sm text-amber-800">
          Agregação parcial: limite de páginas atingido.
        </p>
      ) : null}
      <p className="mt-4 text-sm text-ink">
        Total de requisições (soma mensal): {usage.totalRequests}
      </p>
      {usage.totalRequests === 0 ? (
        <p className="mt-6 text-sm text-ink-soft">Nenhum uso registrado ainda.</p>
      ) : (
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
      )}
    </div>
  );
}
