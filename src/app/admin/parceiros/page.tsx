import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  AdminDataQualityBadge,
  AdminEmptyState,
  AdminKpi,
  AdminSection,
} from "@/components/admin/admin-primitives";
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
      return (
        <AdminEmptyState
          tone="error"
          title="Falha ao carregar parceiros"
          description={error.message}
          actionHref="/admin/parceiros"
          actionLabel="Tentar de novo"
        />
      );
    }
    throw error;
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Crescimento"
        title="Parceiros"
        description="Indicações e recompensas pendentes (sem pagamento automático)."
        meta={
          data.partial ? (
            <span className="inline-flex flex-wrap items-center gap-2">
              <AdminDataQualityBadge quality="parcial" />
              {PARTIAL_HINT} Os totais abaixo não devem ser tratados como
              completos.
            </span>
          ) : (
            "Leitura completa das páginas consultadas."
          )
        }
      />

      <AdminSection
        title="Resumo"
        description="Totais agregados por código de parceiro."
      >
        <AdminKpi
          label="Recompensas pendentes (total)"
          value={String(data.totalRewardPending)}
          partial={data.partial}
        />
      </AdminSection>

      {data.rows.length === 0 ? (
        <AdminEmptyState
          tone="empty"
          title="Nenhum código de parceiro ativo"
          description="Quando referral_codes estiverem ativos, a lista por código aparece aqui."
        />
      ) : (
        <AdminSection title="Por código">
          <ul className="space-y-2 text-sm">
            {data.rows.map((partner) => (
              <li
                key={partner.code}
                className="grid grid-cols-2 gap-2 rounded-lg border border-border/60 px-3 py-2 sm:grid-cols-5"
              >
                <span className="font-mono text-ink">{partner.code}</span>
                <span className="text-ink-soft">
                  {partner.attributions} atrib.
                </span>
                <span className="text-ink-soft">
                  {partner.firstPayments} 1ª cobr.
                </span>
                <span className="text-ink-soft">
                  {partner.secondPayments} 2ª cobr.
                </span>
                <span className="flex flex-wrap items-center gap-2 text-ink-soft">
                  {partner.rewardPending} pend.
                  {data.partial ? (
                    <AdminDataQualityBadge quality="parcial" />
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </AdminSection>
      )}
    </div>
  );
}
