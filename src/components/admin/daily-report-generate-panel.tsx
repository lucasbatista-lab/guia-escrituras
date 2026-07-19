"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/platform/inline-notice";
import { DAILY_REPORT_BACKFILL_MAX_DAYS } from "@/lib/reports/dates";

type GenerateResult = {
  date: string;
  outcome: string;
  errorCode?: string;
};

export function DailyReportGeneratePanel({
  yesterdayDate,
  yesterdayPresent,
}: {
  yesterdayDate: string;
  yesterdayPresent: boolean;
}) {
  const [date, setDate] = useState(yesterdayDate);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [force, setForce] = useState(false);
  const [confirmBackfill, setConfirmBackfill] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<GenerateResult[] | null>(null);
  const [pending, startTransition] = useTransition();

  function run(body: Record<string, unknown>) {
    setMessage(null);
    setError(null);
    setResults(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/reports/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await response.json()) as {
          message?: string;
          code?: string;
          results?: GenerateResult[];
          summary?: { total: number; failed: number };
        };
        if (!response.ok) {
          setError(data.message || "Não foi possível gerar o relatório.");
          return;
        }
        setResults(data.results ?? []);
        const failed = data.summary?.failed ?? 0;
        setMessage(
          failed > 0
            ? `Concluído com ${failed} falha(s) em ${data.summary?.total ?? 0} dia(s).`
            : `Concluído: ${data.summary?.total ?? 0} dia(s) processado(s).`,
        );
      } catch {
        setError("Falha de rede ao gerar o relatório. Tente novamente.");
      }
    });
  }

  return (
    <section className="rounded-xl border border-border/70 bg-card/40 p-5">
      <h2 className="font-display text-xl text-ink">Gerar / recalcular</h2>
      <p className="mt-2 text-sm text-ink-soft">
        Datas em UTC. O cron processa o dia anterior completo após 00:15 UTC.
        Ontem ({yesterdayDate}):{" "}
        {yesterdayPresent ? "já existe no banco" : "ainda não gerado"}.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm text-ink">
          Data (UTC)
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={pending}
            className="mt-1 block rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={force}
            onChange={(e) => setForce(e.target.checked)}
            disabled={pending}
          />
          Forçar recalcular
        </label>
        <Button
          type="button"
          disabled={pending || !date}
          onClick={() => {
            if (force && !window.confirm(`Recalcular o relatório de ${date}?`)) {
              return;
            }
            run({ date, force });
          }}
        >
          {pending ? "Gerando…" : "Gerar dia"}
        </Button>
      </div>

      <div className="mt-6 border-t border-border/60 pt-4">
        <p className="text-sm font-medium text-ink">
          Backfill curto (máx. {DAILY_REPORT_BACKFILL_MAX_DAYS} dias)
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-sm text-ink">
            De
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              disabled={pending}
              className="mt-1 block rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-ink">
            Até
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              disabled={pending}
              className="mt-1 block rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={confirmBackfill}
              onChange={(e) => setConfirmBackfill(e.target.checked)}
              disabled={pending}
            />
            Confirmo o backfill
          </label>
          <Button
            type="button"
            variant="secondary"
            disabled={pending || !from || !to || !confirmBackfill}
            onClick={() => {
              if (
                !window.confirm(
                  `Gerar relatórios de ${from} a ${to} (UTC)? Esta operação é idempotente.`,
                )
              ) {
                return;
              }
              run({ from, to, force, confirm: true });
            }}
          >
            {pending ? "Processando…" : "Executar backfill"}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="mt-4">
          <InlineNotice tone="error">{error}</InlineNotice>
        </div>
      ) : null}
      {message ? (
        <div className="mt-4">
          <InlineNotice tone="success">{message}</InlineNotice>
        </div>
      ) : null}
      {results && results.length > 0 ? (
        <ul className="mt-4 space-y-1 text-sm text-ink-soft">
          {results.map((r) => (
            <li key={r.date}>
              {r.date}: {r.outcome}
              {r.errorCode ? ` (${r.errorCode})` : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
