/**
 * Transparent operational alert rules for the admin overview.
 * No ML / hidden thresholds — constants documented here.
 */

export type OperationalAlertLevel = "info" | "attention" | "critical";

export type OperationalAlert = {
  key: string;
  level: OperationalAlertLevel;
  /** Short operator-facing message. */
  message: string;
  /** What the signal means. */
  meaning: string;
  /** Where to investigate next. */
  investigate: string;
  href: string;
  cta: string;
};

/** Minimum AI requests in 24h before "no activity" alert (avoid cold-start noise). */
export const ALERT_MIN_SUBSCRIBERS_FOR_ACTIVITY = 5;

/** Estimated AI cost (BRL cents) in 24h before cost attention alert. */
export const ALERT_AI_COST_DAY_BRL_CENTS = 5000; // R$ 50 planning estimate

export type OperationalAlertInput = {
  paymentEventsReceivedStuck: number;
  paymentEventsFailed: number;
  pastDueSubscriptions: number;
  checkoutsStuckOver30m: number;
  usersWithDuplicateSubscriptions: number;
  cancelingWithAccessCount: number | null;
  /** Yesterday UTC report row present in daily_reports. */
  yesterdayReportPresent: boolean;
  yesterdayReportDate: string;
  activeSubscriberUsers: number;
  aiRequestsToday: number;
  aiEstimatedCostBrlCentsToday?: number;
};

export function buildOperationalAlerts(
  metrics: OperationalAlertInput,
): OperationalAlert[] {
  const alerts: OperationalAlert[] = [];

  if (!metrics.yesterdayReportPresent) {
    alerts.push({
      key: "daily_report_missing",
      level: "attention",
      message: `Relatório diário UTC ${metrics.yesterdayReportDate} ainda não foi gerado.`,
      meaning:
        "O cron pós-meia-noite UTC não gravou (ou falhou) o dia anterior completo.",
      investigate:
        "Verifique CRON_SECRET na Vercel, logs de /api/cron/daily-report e gere manualmente em Relatórios.",
      href: "/admin/relatorios",
      cta: "Abrir relatórios",
    });
  }

  if (metrics.paymentEventsReceivedStuck > 0) {
    alerts.push({
      key: "received_stuck",
      level: "critical",
      message: `${metrics.paymentEventsReceivedStuck} payment_events em received além do lease.`,
      meaning: "Webhook Stripe possivelmente travado ou instância interrompida.",
      investigate: "Filtrar eventos received_stuck e reprocessar com cuidado.",
      href: "/admin/eventos?status=received_stuck",
      cta: "Ver eventos",
    });
  }

  if (metrics.paymentEventsFailed > 0) {
    alerts.push({
      key: "failed",
      level: "critical",
      message: `${metrics.paymentEventsFailed} payment_events com status failed.`,
      meaning: "Falhas persistidas no processamento de pagamentos.",
      investigate: "Abrir a lista failed e correlacionar com o Dashboard Stripe.",
      href: "/admin/eventos?status=failed",
      cta: "Ver falhas",
    });
  }

  if (metrics.pastDueSubscriptions > 0) {
    alerts.push({
      key: "past_due",
      level: "attention",
      message: `${metrics.pastDueSubscriptions} assinatura(s) past_due.`,
      meaning: "Cobrança em atraso — risco de churn e acesso inconsistente.",
      investigate: "Listar usuários past_due e acompanhar dunning no Stripe.",
      href: "/admin/usuarios?past_due=1",
      cta: "Ver usuários",
    });
  }

  if (metrics.checkoutsStuckOver30m > 0) {
    alerts.push({
      key: "checkout_stuck",
      level: "attention",
      message: `${metrics.checkoutsStuckOver30m} checkout(s) iniciado(s) sem conclusão (>30 min).`,
      meaning: "Funil de pagamento abandonado ou webhook atrasado.",
      investigate: "Conferir intents checkout_created e sessões no Stripe.",
      href: "/admin/usuarios?checkout_pending=1",
      cta: "Ver checkouts",
    });
  }

  if (metrics.usersWithDuplicateSubscriptions > 0) {
    alerts.push({
      key: "duplicates",
      level: "attention",
      message: `${metrics.usersWithDuplicateSubscriptions} usuário(s) com assinaturas ativas duplicadas.`,
      meaning: "Possível cobrança duplicada ou estado inconsistente.",
      investigate: "Filtrar duplicidades e reconciliar no Stripe.",
      href: "/admin/usuarios?duplicates=1",
      cta: "Ver duplicidades",
    });
  }

  if (
    metrics.activeSubscriberUsers >= ALERT_MIN_SUBSCRIBERS_FOR_ACTIVITY &&
    metrics.aiRequestsToday === 0
  ) {
    alerts.push({
      key: "no_ai_activity",
      level: "info",
      message: "Há assinantes ativos, mas nenhum turno de IA registrado hoje (UTC).",
      meaning:
        "Pode ser silêncio real, outage de chat/OpenAI, ou dia ainda cedo em UTC.",
      investigate: "Checar /api/health, logs de chat e uso em /admin/uso.",
      href: "/admin/uso",
      cta: "Ver uso",
    });
  }

  const costToday = metrics.aiEstimatedCostBrlCentsToday ?? 0;
  if (costToday >= ALERT_AI_COST_DAY_BRL_CENTS) {
    alerts.push({
      key: "ai_cost_day",
      level: "attention",
      message: `Custo estimado de IA hoje ≥ R$ ${(ALERT_AI_COST_DAY_BRL_CENTS / 100).toFixed(0)} (planejamento).`,
      meaning:
        "Estimativa interna de tokens — não é fatura OpenAI. Volume alto ou Profundo intenso.",
      investigate: "Revisar /admin/custos e margens de plano.",
      href: "/admin/custos",
      cta: "Ver custos",
    });
  }

  return alerts;
}

/** Map legacy P0/P1 labels used by older UI. */
export function alertLevelToLegacy(
  level: OperationalAlertLevel,
): "P0" | "P1" | "P2" {
  if (level === "critical") return "P0";
  if (level === "attention") return "P1";
  return "P2";
}
