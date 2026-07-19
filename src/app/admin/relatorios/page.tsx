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
      return <p className="text-sm text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const yesterday = yesterdayUtcDate();
  const yesterdayPresent = reports.some((r) => r.reportDate === yesterday);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl text-ink">Relatórios</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Agregados operacionais em UTC (sem conteúdo de conversas). Receita em
          dinheiro Stripe aparece como &quot;Ainda não integrada&quot;. MRR de
          catálogo, quando presente, é estimativa de preço — não caixa.
        </p>
        {!yesterdayPresent ? (
          <p className="mt-3 rounded-lg border border-amber-700/30 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            Relatório de ontem ({yesterday}) ainda não está no banco. Confira o
            cron ou gere manualmente abaixo.
          </p>
        ) : null}
      </div>

      <DailyReportGeneratePanel
        yesterdayDate={yesterday}
        yesterdayPresent={yesterdayPresent}
      />

      {reports.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Nenhum daily_report armazenado ainda. Após configurar CRON_SECRET na
          Vercel, o job 00:15 UTC grava o dia anterior automaticamente.
        </p>
      ) : (
        reports.map((report) => {
          const agg = report.aggregates;
          const interpretation = dailyReportService.interpretWithRules(agg);
          return (
            <section
              key={report.reportDate}
              className="rounded-xl border border-border/70 p-5"
            >
              <h2 className="font-display text-xl text-ink">
                {report.reportDate}{" "}
                <span className="text-sm font-normal text-ink-soft">(UTC)</span>
              </h2>
              <div className="mt-3 grid gap-2 text-sm text-ink-soft sm:grid-cols-2">
                <p>Receita (caixa): {formatRevenueBrl(agg.revenueBrlCents)}</p>
                <p>
                  MRR catálogo:{" "}
                  {agg.catalogMrrBrlCents != null
                    ? formatRevenueBrl(agg.catalogMrrBrlCents)
                    : "—"}
                </p>
                <p>
                  Turnos: {agg.totalRequests} (padrão {agg.standardRequests ?? "—"} ·
                  Profundo {agg.deepRequests ?? "—"})
                </p>
                <p>
                  Novos usuários: {agg.newUsers ?? "—"} · Conversas:{" "}
                  {agg.conversationsStarted ?? "—"}
                </p>
                <p>
                  Checkouts abertos/concluídos: {agg.checkoutsOpened ?? "—"} /{" "}
                  {agg.checkoutsCompleted ?? "—"}
                </p>
                <p>
                  past_due (snapshot): {agg.pastDueSubscriptions ?? "—"} ·
                  referrals: {agg.referralsAttributed ?? "—"}
                </p>
              </div>
              <p className="mt-4 text-ink">{interpretation.summary}</p>
              <div className="mt-4">
                <h3 className="font-medium text-ink">Destaques</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
                  {interpretation.highlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-4">
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
                <div className="mt-4">
                  <h3 className="font-medium text-ink">Notas de métrica</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-ink-soft">
                    {agg.metricNotes.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          );
        })
      )}
    </div>
  );
}
