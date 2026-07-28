import {
  AdminMetricsError,
  getAdminPartnerMetrics,
} from "@/lib/admin/metrics";

const PARTIAL_HINT =
  "PARCIAL — limite de leitura atingido; não é o total completo.";

export default async function AdminParceirosPage() {
  let data;
  try {
    data = await getAdminPartnerMetrics();
  } catch (error) {
    if (error instanceof AdminMetricsError) {
      return <p className="text-sm text-destructive">{error.message}</p>;
    }
    throw error;
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Parceiros</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Indicações e recompensas pendentes (sem pagamento automático).
      </p>

      {data.partial ? (
        <p className="mt-3 text-sm text-amber-800">
          <span className="mr-1 inline-block rounded border border-amber-700/50 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-950">
            PARCIAL
          </span>
          {PARTIAL_HINT} Os totais abaixo não devem ser tratados como completos.
        </p>
      ) : null}

      {data.rows.length === 0 ? (
        <p className="mt-6 text-sm text-ink-soft">Nenhum código de parceiro ativo.</p>
      ) : (
        <ul className="mt-6 space-y-2 text-sm">
          {data.rows.map((partner) => (
            <li
              key={partner.code}
              className="grid grid-cols-2 gap-2 rounded-lg border border-border/60 px-3 py-2 sm:grid-cols-5"
            >
              <span className="font-mono text-ink">{partner.code}</span>
              <span className="text-ink-soft">{partner.attributions} atrib.</span>
              <span className="text-ink-soft">{partner.firstPayments} 1ª cobr.</span>
              <span className="text-ink-soft">{partner.secondPayments} 2ª cobr.</span>
              <span className="text-ink-soft">{partner.rewardPending} pend.</span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-sm text-ink-soft">
        Total de recompensas pendentes: {data.totalRewardPending}
        {data.partial ? " · PARCIAL" : ""}
      </p>
    </div>
  );
}
