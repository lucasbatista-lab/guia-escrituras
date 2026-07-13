import {
  AdminMetricsError,
  formatRevenueBrl,
  getStoredDailyReports,
} from "@/lib/admin/metrics";
import { dailyReportService } from "@/lib/reports";

export default async function AdminRelatoriosPage() {
  let reports;
  try {
    reports = await getStoredDailyReports(10);
  } catch (error) {
    if (error instanceof AdminMetricsError) {
      return <p className="text-sm text-destructive">{error.message}</p>;
    }
    throw error;
  }

  if (reports.length === 0) {
    return (
      <div>
        <h1 className="font-display text-3xl text-ink">Relatórios</h1>
        <p className="mt-6 text-sm text-ink-soft">
          Os relatórios automáticos ainda não foram configurados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl text-ink">Relatórios</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Apenas daily_reports existentes no banco. Receita null aparece como
          &quot;Ainda não integrada&quot;.
        </p>
      </div>

      {reports.map((report) => {
        const agg = report.aggregates;
        const interpretation = dailyReportService.interpretWithRules(agg);
        return (
          <section
            key={report.reportDate}
            className="rounded-xl border border-border/70 p-5"
          >
            <h2 className="font-display text-xl text-ink">{report.reportDate}</h2>
            <p className="mt-2 text-sm text-ink-soft">
              Receita: {formatRevenueBrl(agg.revenueBrlCents)}
            </p>
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
                  interpretation.risks.map((item) => <li key={item}>{item}</li>)
                )}
              </ul>
            </div>
          </section>
        );
      })}
    </div>
  );
}
