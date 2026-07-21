import Link from "next/link";
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
}: {
  title: string;
  rows: AcquisitionBreakdownRow[];
}) {
  if (rows.length === 0) {
    return (
      <div>
        <h2 className="font-display text-xl text-ink">{title}</h2>
        <p className="mt-2 text-sm text-ink-soft">Sem dados neste período.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-xl text-ink">{title}</h2>
      {/* Mobile: stacked cards — avoids unusable horizontal tables */}
      <ul className="mt-3 space-y-2 md:hidden">
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
      <div className="mt-3 hidden overflow-x-auto md:block">
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
    </div>
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
      return <p className="text-sm text-destructive">{error.message}</p>;
    }
    throw error;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-ink">Aquisição</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Origem de cadastros via UTMs/`ref` gravados em signup_intents (atribuição
          de conversão). First/last touch ficam nos cookies; sem conteúdo de
          conversas.{" "}
          {report.partial
            ? "Leitura parcial: limite de páginas atingido."
            : null}
        </p>
        <p className="mt-1 text-xs text-ink-soft">
          Atualizado em {new Date(report.generatedAt).toLocaleString("pt-BR")}
        </p>
      </div>

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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Cadastros (intents)" value={report.totalSignups} />
        <MetricCard
          label="Com atribuição"
          value={report.attributedSignups}
        />
        <MetricCard
          label="Sem atribuição"
          value={report.unattributedSignups}
        />
        <MetricCard
          label="Conv. atribuída → assinatura"
          value={
            report.attributedConversionPct == null
              ? "—"
              : `${report.attributedConversionPct}%`
          }
        />
        <MetricCard label="Checkouts iniciados" value={report.checkoutsStarted} />
        <MetricCard label="Assinaturas (completed)" value={report.subscriptions} />
        <MetricCard label="Com ref (indicação)" value={report.referralSignups} />
        <MetricCard
          label="Indicações → assinatura"
          value={report.referralSubscriptions}
        />
        <MetricCard
          label="Cadastros via share"
          value={report.shareSignups}
        />
        <MetricCard
          label="Assinaturas via share"
          value={report.shareSubscriptions}
        />
        <MetricCard
          label="Ref sem assinatura"
          value={report.referralWithoutSubscription}
        />
      </div>

      {report.totalSignups === 0 ? (
        <p className="text-sm text-ink-soft">
          Nenhum signup_intent neste período.
        </p>
      ) : (
        <div className="space-y-10">
          <BreakdownTable title="Por utm_source" rows={report.bySource} />
          <BreakdownTable title="Por utm_campaign" rows={report.byCampaign} />
          <BreakdownTable title="Por utm_content" rows={report.byContent} />
          <BreakdownTable
            title="Compartilhamentos/indicações (utm_content em share)"
            rows={report.byShareContent}
          />
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/50 px-4 py-3">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="mt-1 font-display text-2xl text-ink">{value}</p>
    </div>
  );
}
