import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  AdminDataQualityBadge,
  AdminEmptyState,
  AdminSection,
} from "@/components/admin/admin-primitives";
import {
  AdminMetricsError,
  formatRevenueBrl,
  getStoredDailyReports,
} from "@/lib/admin/metrics";
import { dailyReportService } from "@/lib/reports";
import { yesterdayUtcDate } from "@/lib/reports/dates";
import { DailyReportGeneratePanel } from "@/components/admin/daily-report-generate-panel";

export default async function AdminRelatoriosPage() {
  let reports;
  try {
    reports = await getStoredDailyReports(14);
  } catch (error) {
    if (error instanceof AdminMetricsError) {
      return (
        <AdminEmptyState
          tone="error"
          title="Falha ao carregar relatórios"
          description={error.message}
          actionHref="/admin/relatorios"
          actionLabel="Tentar de novo"
        />
      );
    }
    throw error;
  }

  const yesterday = yesterdayUtcDate();
  const yesterdayPresent = reports.some((r) => r.reportDate === yesterday);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Receita"
        title="Relatórios"
        description="Agregados operacionais em UTC (sem conteúdo de conversas). Receita em dinheiro Stripe aparece como “Ainda não integrada”. MRR de catálogo, quando presente, é estimativa de preço — não caixa."
        meta={
          <>
            Fonte: daily_reports · Período exibido: últimos 14 dias UTC
            {!yesterdayPresent ? (
              <>
                {" "}
                ·{" "}
                <span className="text-amber-950">
                  Relatório de ontem ({yesterday}) ainda não está no banco
                </span>
              </>
            ) : null}
          </>
        }
      />

      {!yesterdayPresent ? (
        <div className="rounded-xl border border-amber-700/30 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Confira o cron ou gere manualmente abaixo.
        </div>
      ) : null}

      <DailyReportGeneratePanel
        yesterdayDate={yesterday}
        yesterdayPresent={yesterdayPresent}
      />

      {reports.length === 0 ? (
        <AdminEmptyState
          tone="empty"
          title="Nenhum daily_report armazenado ainda"
          description="Após configurar CRON_SECRET na Vercel, o job 00:15 UTC grava o dia anterior automaticamente."
        />
      ) : (
        <div className="space-y-6">
          {reports.map((report) => {
            const agg = report.aggregates;
            const interpretation = dailyReportService.interpretWithRules(agg);
            const mrrIsEstimate = agg.catalogMrrBrlCents != null;

            return (
              <AdminSection
                key={report.reportDate}
                title={`${report.reportDate} (UTC)`}
                description="Dia fechado em UTC — não confundir com o dia operacional em Brasília."
                className="rounded-xl border border-border/70 p-5"
              >
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-ink-soft">Receita (caixa):</span>
                    <span className="text-ink">
                      {formatRevenueBrl(agg.revenueBrlCents)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-ink-soft">MRR catálogo:</span>
                    <span className="text-ink">
                      {agg.catalogMrrBrlCents != null
                        ? formatRevenueBrl(agg.catalogMrrBrlCents)
                        : "—"}
                    </span>
                    {mrrIsEstimate ? (
                      <AdminDataQualityBadge quality="estimada" />
                    ) : null}
                  </div>
                  <p className="text-ink-soft">
                    Turnos: {agg.totalRequests} (padrão{" "}
                    {agg.standardRequests ?? "—"} · Profundo{" "}
                    {agg.deepRequests ?? "—"})
                  </p>
                  <p className="text-ink-soft">
                    Novos usuários: {agg.newUsers ?? "—"} · Conversas:{" "}
                    {agg.conversationsStarted ?? "—"}
                  </p>
                  <p className="text-ink-soft">
                    Checkouts abertos/concluídos: {agg.checkoutsOpened ?? "—"} /{" "}
                    {agg.checkoutsCompleted ?? "—"}
                  </p>
                  <p className="text-ink-soft">
                    past_due (snapshot): {agg.pastDueSubscriptions ?? "—"} ·
                    referrals: {agg.referralsAttributed ?? "—"}
                  </p>
                </div>
                <p className="text-ink">{interpretation.summary}</p>
                <div>
                  <h3 className="font-medium text-ink">Destaques</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
                    {interpretation.highlights.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-ink">Riscos</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
                    {interpretation.risks.length === 0 ? (
                      <li>Nenhum risco sinalizado.</li>
                    ) : (
                      interpretation.risks.map((item) => (
                        <li key={item}>{item}</li>
                      ))
                    )}
                  </ul>
                </div>
                {agg.metricNotes && agg.metricNotes.length > 0 ? (
                  <div>
                    <h3 className="font-medium text-ink">Notas de métrica</h3>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-ink-soft">
                      {agg.metricNotes.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </AdminSection>
            );
          })}
        </div>
      )}
    </div>
  );
}
