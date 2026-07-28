import Link from "next/link";
import {
  AdminMetricsError,
  alertLevelToLegacy,
  buildOperationalAlerts,
  getAdminCrisisSnapshot,
  getAdminOverviewMetrics,
  getStoredDailyReports,
} from "@/lib/admin";
import { HealthStatusPanel } from "@/components/admin/health-status-panel";

export const dynamic = "force-dynamic";

export default async function AdminIncidentesPage() {
  let metrics;
  let crisis;
  let reports;
  try {
    [metrics, crisis, reports] = await Promise.all([
      getAdminOverviewMetrics(),
      getAdminCrisisSnapshot(),
      getStoredDailyReports(1),
    ]);
  } catch (error) {
    if (error instanceof AdminMetricsError) {
      return <p className="text-sm text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const alerts = buildOperationalAlerts({
    paymentEventsReceivedStuck: metrics.paymentEventsReceivedStuck,
    paymentEventsFailed: metrics.paymentEventsFailed,
    pastDueSubscriptions: metrics.pastDueSubscriptions,
    checkoutsStuckOver30m: metrics.checkoutsStuckOver30m,
    usersWithDuplicateSubscriptions: metrics.usersWithDuplicateSubscriptions,
    cancelingWithAccessCount: metrics.cancelingWithAccessCount,
    yesterdayReportPresent: metrics.yesterdayReportPresent,
    yesterdayReportDate: metrics.yesterdayReportDate,
    activeSubscriberUsers: metrics.activeSubscriberUsers,
    aiRequestsToday: metrics.aiRequestsToday,
    aiEstimatedCostBrlCentsToday: metrics.aiEstimatedCostBrlCentsToday,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-ink">Incidentes</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Retrospectivo + alertas de billing/webhook. Não substitui logs da
          Vercel/Supabase nem é um NOC completo. Health check é sob demanda,
          não automático a cada visita.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-ink">Saúde da aplicação</h2>
        <HealthStatusPanel />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-ink">Alertas operacionais</h2>
        {alerts.length === 0 ? (
          <p className="rounded-lg border border-border/60 bg-sand-50/80 px-3 py-3 text-sm text-ink-soft">
            Nenhum alerta operacional agora.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {alerts.map((alert) => (
              <li key={alert.key}>
                <Link
                  href={alert.href}
                  className={
                    alert.level === "critical"
                      ? "flex min-h-11 flex-col gap-1 rounded-lg border border-red-700/40 bg-red-50 px-3 py-3 text-sm text-red-950"
                      : alert.level === "attention"
                        ? "flex min-h-11 flex-col gap-1 rounded-lg border border-amber-700/40 bg-amber-50 px-3 py-3 text-sm text-amber-950"
                        : "flex min-h-11 flex-col gap-1 rounded-lg border border-border/70 bg-sand-50 px-3 py-3 text-sm text-ink"
                  }
                >
                  <span>
                    <span className="font-medium">
                      {alertLevelToLegacy(alert.level)}
                    </span>{" "}
                    · {alert.message}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-ink">
          Interceptações de crise
        </h2>
        <p className="text-xs text-ink-soft">{crisis.markerNote}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard label="Hoje" value={crisis.interceptionsToday} />
          <MetricCard label="7 dias (rolante)" value={crisis.interceptions7d} />
          <MetricCard label="30 dias (rolante)" value={crisis.interceptions30d} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-ink">Pagamentos parados</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href="/admin/eventos?status=received_stuck"
            className="rounded-md border border-border/70 bg-card/50 px-3 py-1.5 text-ink hover:bg-sand-50"
          >
            Received presos ({metrics.paymentEventsReceivedStuck})
          </Link>
          <Link
            href="/admin/eventos?status=failed"
            className="rounded-md border border-border/70 bg-card/50 px-3 py-1.5 text-ink hover:bg-sand-50"
          >
            Failed ({metrics.paymentEventsFailed})
          </Link>
          <Link
            href="/admin/usuarios?past_due=1"
            className="rounded-md border border-border/70 bg-card/50 px-3 py-1.5 text-ink hover:bg-sand-50"
          >
            Past due ({metrics.pastDueSubscriptions})
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-ink">Relatório diário</h2>
        {reports.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Nenhum daily_report armazenado ainda para o dia anterior UTC (
            {metrics.yesterdayReportDate}).
          </p>
        ) : (
          <p className="text-sm text-ink-soft">
            Último relatório disponível: {reports[0]?.reportDate}.{" "}
            <Link href="/admin/relatorios" className="underline underline-offset-2">
              Ver relatórios
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 p-4">
      <p className="text-xs uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-2 font-display text-2xl text-ink">{value}</p>
    </div>
  );
}
