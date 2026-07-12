export interface DailyReportAggregates {
  date: string;
  activeSubscribers: number;
  revenueBrlCents: number;
  activeUsers: number;
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  aiCostUsdMicros: number;
  aiCostBrlCents: number;
  usageP50: number;
  usageP90: number;
  usageP99: number;
  errorCount: number;
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
}

export interface DailyReportInterpretation {
  summary: string;
  highlights: string[];
  risks: string[];
  recommendations: string[];
}

/**
 * DailyReportService — aggregates come from SQL; AI only interprets aggregates.
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
      `${aggregates.activeSubscribers} assinantes ativos`,
      `Receita do dia: R$ ${(aggregates.revenueBrlCents / 100).toFixed(2)}`,
      `Custo médio de IA por usuário ativo: R$ ${(avgCostPerUser / 100).toFixed(2)}`,
    ];

    const risks: string[] = [];
    if (aggregates.errorCount > 20) {
      risks.push("Volume elevado de erros nas últimas 24h.");
    }
    if (aggregates.usageP99 > aggregates.usageP50 * 5) {
      risks.push("Cauda de uso anômala (p99 muito acima da mediana).");
    }
    for (const anomaly of aggregates.anomalies) {
      risks.push(`Sinal anômalo: ${anomaly.signal} (${anomaly.count}).`);
    }

    const recommendations: string[] = [
      "Revisar usuários no percentil extremo sem abrir conteúdo de conversas.",
      "Comparar custo de IA com MRR estimado semanalmente.",
    ];

    return {
      summary: `Relatório de ${aggregates.date}: operação com ${aggregates.activeUsers} usuários ativos e ${aggregates.totalRequests} requisições.`,
      highlights,
      risks,
      recommendations,
    };
  }
}

export const dailyReportService = new DailyReportService();
