export interface DailyReportAggregates {
  date: string;
  /** Snapshot of active+trialing at generation time (not historical). */
  activeSubscribers: number;
  /** Stripe cash revenue for the day — null until payments ledger exists. */
  revenueBrlCents: number | null;
  activeUsers: number;
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  aiCostUsdMicros: number;
  aiCostBrlCents: number;
  /** Per-user request counts for the day when enrichable; else 0. */
  usageP50: number;
  usageP90: number;
  usageP99: number;
  /** usage_events.success = false for the day (rarely written by chat today). */
  errorCount: number;
  /** Not computed without event ledger — always 0 until supported. */
  retentionD1: number;
  retentionD7: number;
  retentionD30: number;
  conversionsByOrigin: Array<{ origin: string; count: number }>;
  partnerPerformance: Array<{
    partnerCode: string;
    attributions: number;
    conversions: number;
  }>;
  anomalies: Array<{ signal: string; count: number }>;

  // --- Enrichment (real tables only; optional for older stored rows) ---
  newUsers?: number;
  totalUsers?: number;
  newSubscriptions?: number;
  trialingSubscriptions?: number;
  pastDueSubscriptions?: number;
  canceledSubscriptions?: number;
  checkoutsOpened?: number;
  checkoutsCompleted?: number;
  standardRequests?: number;
  deepRequests?: number;
  conversationsStarted?: number;
  onboardingCompleted?: number;
  referralsAttributed?: number;
  avgLatencyMs?: number | null;
  /** Catalog MRR snapshot at generation — not Stripe cash. */
  catalogMrrBrlCents?: number | null;
  paymentEventsFailed?: number;
  paymentEventsProcessed?: number;
  metricNotes?: string[];
}

export interface DailyReportInterpretation {
  summary: string;
  highlights: string[];
  risks: string[];
  recommendations: string[];
}

/**
 * DailyReportService — aggregates come from SQL + safe enrichment.
 * Never include names, messages, or spiritual content.
 */
export class DailyReportService {
  buildPrompt(aggregates: DailyReportAggregates): string {
    return [
      "Interprete apenas estes agregados operacionais. Não invente dados pessoais.",
      "Não mencione nomes, mensagens ou conteúdo espiritual de usuários.",
      JSON.stringify(aggregates, null, 2),
    ].join("\n\n");
  }

  interpretWithRules(
    aggregates: DailyReportAggregates,
  ): DailyReportInterpretation {
    const avgCostPerUser =
      aggregates.activeUsers > 0
        ? aggregates.aiCostBrlCents / aggregates.activeUsers
        : 0;

    const highlights: string[] = [
      `${aggregates.activeSubscribers} assinantes ativos/trialing (snapshot)`,
      aggregates.revenueBrlCents == null
        ? "Receita do dia: Ainda não integrada"
        : `Receita do dia: R$ ${(aggregates.revenueBrlCents / 100).toFixed(2)}`,
      `Custo estimado de IA: R$ ${(aggregates.aiCostBrlCents / 100).toFixed(2)} (${aggregates.totalRequests} turnos)`,
      `Custo médio estimado por usuário ativo: R$ ${(avgCostPerUser / 100).toFixed(2)}`,
    ];

    if (aggregates.newUsers != null) {
      highlights.push(`${aggregates.newUsers} novos usuários no dia`);
    }
    if (aggregates.deepRequests != null || aggregates.standardRequests != null) {
      highlights.push(
        `Uso: ${aggregates.standardRequests ?? 0} padrão · ${aggregates.deepRequests ?? 0} Profundo`,
      );
    }
    if (aggregates.catalogMrrBrlCents != null) {
      highlights.push(
        `MRR de catálogo (estimativa): R$ ${(aggregates.catalogMrrBrlCents / 100).toFixed(2)}`,
      );
    }

    const risks: string[] = [];
    if (aggregates.errorCount > 20) {
      risks.push(
        "Volume elevado de usage_events com success=false (falhas persistidas).",
      );
    }
    if (
      aggregates.usageP50 > 0 &&
      aggregates.usageP99 > aggregates.usageP50 * 5
    ) {
      risks.push("Cauda de uso anômala (p99 muito acima da mediana).");
    }
    if ((aggregates.pastDueSubscriptions ?? 0) > 0) {
      risks.push(
        `${aggregates.pastDueSubscriptions} assinatura(s) past_due (snapshot).`,
      );
    }
    if ((aggregates.paymentEventsFailed ?? 0) > 0) {
      risks.push(
        `${aggregates.paymentEventsFailed} payment_events failed no dia.`,
      );
    }
    for (const anomaly of aggregates.anomalies) {
      risks.push(`Sinal anômalo: ${anomaly.signal} (${anomaly.count}).`);
    }
    for (const note of aggregates.metricNotes ?? []) {
      if (note.toLowerCase().includes("limitação")) {
        risks.push(note);
      }
    }

    const recommendations: string[] = [
      "Revisar usuários no percentil extremo sem abrir conteúdo de conversas.",
      "Comparar custo estimado de IA com MRR de catálogo semanalmente.",
      "Falhas 409/429/503 do chat ainda não entram nestes agregados (somente logs).",
    ];

    return {
      summary: `Relatório UTC ${aggregates.date}: ${aggregates.activeUsers} usuários ativos em IA, ${aggregates.totalRequests} turnos, ${aggregates.activeSubscribers} assinantes (snapshot).`,
      highlights,
      risks,
      recommendations,
    };
  }
}

export const dailyReportService = new DailyReportService();

/** Fill required numeric fields when reading older or partial SQL payloads. */
export function normalizeDailyReportAggregates(
  raw: Partial<DailyReportAggregates> & { date: string },
): DailyReportAggregates {
  return {
    date: raw.date,
    activeSubscribers: Number(raw.activeSubscribers ?? 0),
    revenueBrlCents:
      raw.revenueBrlCents === undefined ? null : raw.revenueBrlCents,
    activeUsers: Number(raw.activeUsers ?? 0),
    totalRequests: Number(raw.totalRequests ?? 0),
    totalInputTokens: Number(raw.totalInputTokens ?? 0),
    totalOutputTokens: Number(raw.totalOutputTokens ?? 0),
    aiCostUsdMicros: Number(raw.aiCostUsdMicros ?? 0),
    aiCostBrlCents: Number(raw.aiCostBrlCents ?? 0),
    usageP50: Number(raw.usageP50 ?? 0),
    usageP90: Number(raw.usageP90 ?? 0),
    usageP99: Number(raw.usageP99 ?? 0),
    errorCount: Number(raw.errorCount ?? 0),
    retentionD1: Number(raw.retentionD1 ?? 0),
    retentionD7: Number(raw.retentionD7 ?? 0),
    retentionD30: Number(raw.retentionD30 ?? 0),
    conversionsByOrigin: Array.isArray(raw.conversionsByOrigin)
      ? raw.conversionsByOrigin
      : [],
    partnerPerformance: Array.isArray(raw.partnerPerformance)
      ? raw.partnerPerformance
      : [],
    anomalies: Array.isArray(raw.anomalies) ? raw.anomalies : [],
    newUsers: raw.newUsers,
    totalUsers: raw.totalUsers,
    newSubscriptions: raw.newSubscriptions,
    trialingSubscriptions: raw.trialingSubscriptions,
    pastDueSubscriptions: raw.pastDueSubscriptions,
    canceledSubscriptions: raw.canceledSubscriptions,
    checkoutsOpened: raw.checkoutsOpened,
    checkoutsCompleted: raw.checkoutsCompleted,
    standardRequests: raw.standardRequests,
    deepRequests: raw.deepRequests,
    conversationsStarted: raw.conversationsStarted,
    onboardingCompleted: raw.onboardingCompleted,
    referralsAttributed: raw.referralsAttributed,
    avgLatencyMs: raw.avgLatencyMs,
    catalogMrrBrlCents: raw.catalogMrrBrlCents,
    paymentEventsFailed: raw.paymentEventsFailed,
    paymentEventsProcessed: raw.paymentEventsProcessed,
    metricNotes: raw.metricNotes,
  };
}
