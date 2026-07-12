import { dailyReportService } from "@/lib/reports";
import type { DailyReportAggregates } from "@/lib/reports";

const mockAggregates: DailyReportAggregates = {
  date: "2026-07-11",
  activeSubscribers: 241,
  revenueBrlCents: 482000,
  activeUsers: 174,
  totalRequests: 3120,
  totalInputTokens: 4_200_000,
  totalOutputTokens: 1_800_000,
  aiCostUsdMicros: 7_500_000,
  aiCostBrlCents: 41200,
  usageP50: 12,
  usageP90: 41,
  usageP99: 96,
  errorCount: 18,
  retentionD1: 0.62,
  retentionD7: 0.41,
  retentionD30: 0.28,
  conversionsByOrigin: [
    { origin: "organic", count: 18 },
    { origin: "referral", count: 9 },
  ],
  partnerPerformance: [
    { partnerCode: "PARCEIRO_A", attributions: 20, conversions: 14 },
  ],
  anomalies: [{ signal: "burst_diario", count: 2 }],
};

export default function AdminRelatoriosPage() {
  const interpretation = dailyReportService.interpretWithRules(mockAggregates);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Relatórios</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Agregados calculados no banco; a IA só interpreta números — nunca
          mensagens.
        </p>
      </div>
      <p className="text-ink">{interpretation.summary}</p>
      <div>
        <h2 className="font-medium text-ink">Destaques</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
          {interpretation.highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="font-medium text-ink">Riscos</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
          {interpretation.risks.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
