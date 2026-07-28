import Link from "next/link";
import {
  AdminMetricsError,
  buildOperationalAlerts,
  getAdminCrisisSnapshot,
  getAdminOverviewMetrics,
  getStoredDailyReports,
} from "@/lib/admin";
import { HealthStatusPanel } from "@/components/admin/health-status-panel";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  AdminAlertItem,
  AdminEmptyState,
  AdminKpi,
  AdminOpLink,
  AdminSection,
} from "@/components/admin/admin-primitives";

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
      return (
        <AdminEmptyState
          tone="error"
          title="Falha ao carregar incidentes"
          description={error.message}
          actionHref="/admin/incidentes"
          actionLabel="Tentar de novo"
        />
      );
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

  const criticalCount = alerts.filter((a) => a.level === "critical").length;
  const attentionCount = alerts.filter((a) => a.level === "attention").length;

  const operationStatus =
    criticalCount > 0
      ? {
          label: "Crítico",
          detail: `${criticalCount} alerta(s) crítico(s) exigem investigação imediata.`,
        }
      : attentionCount > 0
        ? {
            label: "Atenção",
            detail: `${attentionCount} item(ns) de atenção nas integrações disponíveis.`,
          }
        : {
            label: "Saudável",
            detail:
              "Sem alertas críticos ou de atenção detectados pelas integrações disponíveis.",
          };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Operação"
        title="Incidentes"
        description="Retrospectivo + alertas de billing/webhook. Não substitui logs da Vercel/Supabase nem é um NOC completo."
        meta={
          <>
            Status operacional:{" "}
            <span className="font-medium text-ink">{operationStatus.label}</span>
            {" · "}
            {operationStatus.detail} Health check é sob demanda — indisponível
            para verificação ≠ serviço confirmado fora do ar.
          </>
        }
      />

      <AdminSection
        title="Saúde da aplicação"
        description="App e banco — verificação manual com timeout. Resultado indisponível não confirma queda."
      >
        <HealthStatusPanel />
      </AdminSection>

      <AdminSection
        title="Alertas operacionais"
        description="Billing, relatórios, pagamentos e IA — priorize críticos e atenção."
        tone={alerts.length > 0 ? "priority" : undefined}
      >
        {alerts.length === 0 ? (
          <AdminEmptyState
            tone="empty"
            title="Nenhum alerta operacional agora"
            description="Integrações disponíveis não sinalizaram itens críticos ou de atenção. Continue revisões de rotina."
            actionHref="/admin/eventos"
            actionLabel="Ver eventos de pagamento"
          />
        ) : (
          <ul className="space-y-2">
            {alerts.map((alert) => (
              <AdminAlertItem
                key={alert.key}
                level={alert.level}
                title={alert.message}
                context={`${alert.meaning} → ${alert.investigate}`}
                period="Snapshot agora"
                actionLabel={alert.cta}
                href={alert.href}
                source="Integrações do Admin"
              />
            ))}
          </ul>
        )}
      </AdminSection>

      <AdminSection
        title="Interceptações de crise"
        description="Contagem via marcador técnico — sem conteúdo de conversas."
      >
        <p className="text-xs text-ink-soft">{crisis.markerNote}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <AdminKpi label="Hoje" value={String(crisis.interceptionsToday)} />
          <AdminKpi
            label="7 dias (rolante)"
            value={String(crisis.interceptions7d)}
          />
          <AdminKpi
            label="30 dias (rolante)"
            value={String(crisis.interceptions30d)}
          />
        </div>
      </AdminSection>

      <AdminSection
        title="Pagamentos parados"
        description="Atalhos para filas failed, received presos e past due."
      >
        <div className="flex flex-wrap gap-2 text-sm">
          <AdminOpLink href="/admin/eventos?status=received_stuck">
            Received presos ({metrics.paymentEventsReceivedStuck})
          </AdminOpLink>
          <AdminOpLink href="/admin/eventos?status=failed">
            Failed ({metrics.paymentEventsFailed})
          </AdminOpLink>
          <AdminOpLink href="/admin/usuarios?past_due=1">
            Past due ({metrics.pastDueSubscriptions})
          </AdminOpLink>
        </div>
      </AdminSection>

      <AdminSection
        title="Relatório diário"
        description="Último daily_report UTC — ausência gera alerta acima, não significa app fora do ar."
      >
        {reports.length === 0 ? (
          <AdminEmptyState
            tone="unavailable"
            title="Nenhum daily_report armazenado"
            description={`Nenhum relatório para o dia anterior UTC (${metrics.yesterdayReportDate}). Confira cron ou gere manualmente.`}
            actionHref="/admin/relatorios"
            actionLabel="Abrir relatórios"
          />
        ) : (
          <p className="text-sm text-ink-soft">
            Último relatório disponível: {reports[0]?.reportDate}.{" "}
            <Link
              href="/admin/relatorios"
              className="underline underline-offset-2"
            >
              Ver relatórios
            </Link>
          </p>
        )}
      </AdminSection>
    </div>
  );
}
