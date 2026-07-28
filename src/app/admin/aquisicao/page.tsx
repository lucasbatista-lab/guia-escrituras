import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  AdminEmptyState,
  AdminFilterSummary,
  AdminKpi,
  AdminSection,
} from "@/components/admin/admin-primitives";
import {
  AdminMetricsError,
  getAdminAcquisitionReport,
  parseAcquisitionPeriod,
  type AcquisitionBreakdownRow,
} from "@/lib/admin";

export const dynamic = "force-dynamic";

function BreakdownTable({
  title,
  rows,
  partial,
}: {
  title: string;
  rows: AcquisitionBreakdownRow[];
  partial: boolean;
}) {
  if (rows.length === 0) {
    return (
      <AdminSection title={title}>
        <AdminEmptyState
          tone="empty"
          title="Sem dados neste período"
          description="Nenhuma linha de atribuição UTM/ref para este recorte."
        />
      </AdminSection>
    );
  }

  return (
    <AdminSection title={title}>
      {/* Mobile: stacked cards — avoids unusable horizontal tables */}
      <ul className="space-y-2 md:hidden">
        {rows.map((row) => (
          <li
            key={row.key}
            className="rounded-lg border border-border/60 px-3 py-3 text-sm"
          >
            <p className="font-mono text-xs text-ink">{row.key}</p>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-ink-soft">
              <div>
                <dt className="text-xs">Cadastros</dt>
                <dd className="text-ink">{row.signups}</dd>
              </div>
              <div>
                <dt className="text-xs">Checkouts</dt>
                <dd className="text-ink">{row.checkoutsStarted}</dd>
              </div>
              <div>
                <dt className="text-xs">Assinaturas</dt>
                <dd className="text-ink">{row.subscriptions}</dd>
              </div>
              <div>
                <dt className="text-xs">Conv. %</dt>
                <dd className="text-ink">
                  {row.conversionPct == null ? "—" : `${row.conversionPct}%`}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr className="border-b border-border/70 text-ink-soft">
              <th scope="col" className="py-2 pr-3 font-medium">
                Chave
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Cadastros
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Checkouts
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Assinaturas
              </th>
              <th scope="col" className="py-2 font-medium">
                Conv. %
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-border/40">
                <td className="py-2 pr-3 font-mono text-xs text-ink">
                  {row.key}
                </td>
                <td className="py-2 pr-3 text-ink-soft">{row.signups}</td>
                <td className="py-2 pr-3 text-ink-soft">
                  {row.checkoutsStarted}
                </td>
                <td className="py-2 pr-3 text-ink-soft">{row.subscriptions}</td>
                <td className="py-2 text-ink-soft">
                  {row.conversionPct == null ? "—" : `${row.conversionPct}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {partial ? (
        <p className="text-xs text-ink-soft">
          Tabela pode estar incompleta — leitura parcial do período.
        </p>
      ) : null}
    </AdminSection>
  );
}

export default async function AdminAquisicaoPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const period = parseAcquisitionPeriod(params.period);

  let report;
  try {
    report = await getAdminAcquisitionReport(period);
  } catch (error) {
    if (error instanceof AdminMetricsError) {
      return (
        <AdminEmptyState
          tone="error"
          title="Falha ao carregar aquisição"
          description={error.message}
          actionHref="/admin/aquisicao"
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
        title="Aquisição"
        description="Origem de cadastros via UTMs/ref gravados em signup_intents (funil de conversão). “Assinaturas” = intent completed — não é receita Stripe. First/last touch ficam nos cookies; sem conteúdo de conversas."
        meta={
          <>
            Período: últimos {period} dias · Atualizado em{" "}
            {new Date(report.generatedAt).toLocaleString("pt-BR")}
            {report.partial ? " · Leitura parcial (limite de páginas)" : ""}
          </>
        }
      />

      <div className="flex flex-wrap gap-2 text-sm">
        {([7, 30, 90] as const).map((days) => (
          <Link
            key={days}
            href={`/admin/aquisicao?period=${days}`}
            className={
              period === days
                ? "rounded-md bg-ink px-3 py-1.5 text-sand-50"
                : "rounded-md border border-border px-3 py-1.5 text-ink-soft hover:text-ink"
            }
          >
            {days} dias
          </Link>
        ))}
      </div>

      <AdminFilterSummary
        items={[{ label: "Período", value: `${period} dias` }]}
        partial={report.partial}
      />

      <AdminSection
        title="Funil do período"
        description="Cadastros → checkouts → assinaturas completadas. Visitas anteriores ao cadastro não são medidas aqui."
        tone="priority"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminKpi label="Cadastros (intents)" value={String(report.totalSignups)} />
          <AdminKpi
            label="Checkouts iniciados"
            value={String(report.checkoutsStarted)}
          />
          <AdminKpi
            label="Assinaturas (completed)"
            value={String(report.subscriptions)}
          />
          <AdminKpi
            label="Conv. atribuída → assinatura"
            value={
              report.attributedConversionPct == null
                ? "—"
                : `${report.attributedConversionPct}%`
            }
            partial={report.partial}
          />
        </div>
        <p className="text-xs text-ink-soft">
          Limitação: tráfego de visita (antes do signup_intent) não está
          disponível neste painel — use analytics externo se precisar medir
          impressões ou cliques na landing.
        </p>
      </AdminSection>

      <AdminSection
        title="Atribuição"
        description="Compara cadastros com e sem UTMs/ref registrados no intent."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AdminKpi
            label="Com atribuição"
            value={String(report.attributedSignups)}
            partial={report.partial}
          />
          <AdminKpi
            label="Sem atribuição"
            value={String(report.unattributedSignups)}
            partial={report.partial}
          />
          <AdminKpi
            label="Com ref (indicação)"
            value={String(report.referralSignups)}
            partial={report.partial}
          />
        </div>
      </AdminSection>

      <AdminSection
        title="Indicações e share"
        description="Referrals e links compartilhados capturados no signup_intent."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AdminKpi
            label="Indicações → assinatura"
            value={String(report.referralSubscriptions)}
            partial={report.partial}
          />
          <AdminKpi
            label="Cadastros via share"
            value={String(report.shareSignups)}
            partial={report.partial}
          />
          <AdminKpi
            label="Assinaturas via share"
            value={String(report.shareSubscriptions)}
            partial={report.partial}
          />
          <AdminKpi
            label="Ref sem assinatura"
            value={String(report.referralWithoutSubscription)}
            partial={report.partial}
          />
        </div>
      </AdminSection>

      {report.totalSignups === 0 ? (
        <AdminEmptyState
          tone="empty"
          title="Nenhum signup_intent neste período"
          description="Ajuste o período ou aguarde novos cadastros para ver o funil e as tabelas UTM."
          actionHref="/admin/aquisicao?period=90"
          actionLabel="Ver 90 dias"
        />
      ) : (
        <div className="space-y-8">
          <BreakdownTable
            title="Por utm_source"
            rows={report.bySource}
            partial={report.partial}
          />
          <BreakdownTable
            title="Por utm_medium"
            rows={report.byMedium}
            partial={report.partial}
          />
          <BreakdownTable
            title="Por utm_campaign"
            rows={report.byCampaign}
            partial={report.partial}
          />
          <BreakdownTable
            title="Por utm_content"
            rows={report.byContent}
            partial={report.partial}
          />
          <BreakdownTable
            title="Por origem × conteúdo (source · content)"
            rows={report.bySourceContent}
            partial={report.partial}
          />
          <BreakdownTable
            title="Compartilhamentos/indicações (utm_content em share)"
            rows={report.byShareContent}
            partial={report.partial}
          />
        </div>
      )}
    </div>
  );
}
