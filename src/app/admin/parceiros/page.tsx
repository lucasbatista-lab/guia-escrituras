import { MOCK_ADMIN_METRICS } from "@/lib/database";

export default function AdminParceirosPage() {
  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Parceiros</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Indicações e recompensas pendentes (sem pagamento automático nesta
        fatia).
      </p>
      <ul className="mt-6 space-y-2 text-sm">
        {MOCK_ADMIN_METRICS.partners.map((partner) => (
          <li
            key={partner.code}
            className="grid grid-cols-3 gap-2 rounded-lg border border-border/60 px-3 py-2"
          >
            <span className="font-mono text-ink">{partner.code}</span>
            <span className="text-ink-soft">
              {partner.conversions} conversões
            </span>
            <span className="text-ink-soft">
              {partner.pendingRewards} pendentes
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-ink-soft">
        Total de recompensas pendentes: {MOCK_ADMIN_METRICS.pendingRewards}
      </p>
    </div>
  );
}
