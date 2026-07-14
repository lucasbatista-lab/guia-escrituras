"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  stripeModeLabelPt,
  stripeOverallStatusPt,
  stripePlanReadyLabelPt,
  translateStripeReadinessIssue,
} from "@/lib/stripe/readiness-labels";
import type { StripeKeyMode } from "@/lib/stripe/key-mode";

type ReadinessPayload = {
  ready: boolean;
  mode: StripeKeyMode;
  webhookConfigured: boolean;
  plans: {
    essencial: { ready: boolean };
    caminho: { ready: boolean };
    profundo: { ready: boolean };
  };
  issues: string[];
};

type ErrorPayload = {
  code?: string;
  message?: string;
};

export function StripeReadinessPanel() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReadinessPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onCheck() {
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const res = await fetch("/api/admin/stripe/readiness", {
        method: "GET",
        credentials: "same-origin",
      });

      if (res.status === 401) {
        setError("Faça login como administrador para verificar.");
        return;
      }
      if (res.status === 403) {
        setError("Acesso restrito a administradores.");
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as ErrorPayload | null;
        setError(
          body?.message?.trim() ||
            "Não foi possível verificar a configuração da Stripe.",
        );
        return;
      }

      const data = (await res.json()) as ReadinessPayload;
      setReport(data);
    } catch {
      setError("Falha de conexão ao verificar a Stripe.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border/70 bg-card/60 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-soft">
          Consulta sob demanda. Não roda automaticamente a cada visita.
        </p>
        <Button
          type="button"
          onClick={() => void onCheck()}
          disabled={loading}
          className="min-h-11 bg-ink hover:bg-ink/90"
        >
          {loading ? "Verificando…" : "Verificar configuração da Stripe"}
        </Button>
      </div>

      <div aria-live="polite" aria-busy={loading}>
        {loading ? (
          <p className="text-sm text-ink-soft">Consultando prontidão…</p>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {report ? (
          <div className="space-y-3 text-sm">
            <p
              className={
                report.ready
                  ? "font-medium text-ink"
                  : "font-medium text-amber-900"
              }
              role="status"
            >
              {stripeOverallStatusPt(report.ready)}
            </p>
            <ul className="space-y-1.5 text-ink-soft">
              <li>
                Ambiente:{" "}
                <span className="text-ink">{stripeModeLabelPt(report.mode)}</span>
              </li>
              <li>
                Webhook:{" "}
                <span className="text-ink">
                  {report.webhookConfigured
                    ? "Configurado"
                    : "Não configurado"}
                </span>
              </li>
              <li>
                Essencial:{" "}
                <span className="text-ink">
                  {stripePlanReadyLabelPt(report.plans.essencial.ready)}
                </span>
              </li>
              <li>
                Caminho:{" "}
                <span className="text-ink">
                  {stripePlanReadyLabelPt(report.plans.caminho.ready)}
                </span>
              </li>
              <li>
                Profundo:{" "}
                <span className="text-ink">
                  {stripePlanReadyLabelPt(report.plans.profundo.ready)}
                </span>
              </li>
            </ul>
            {report.issues.length > 0 ? (
              <div>
                <p className="font-medium text-ink">Problemas</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-ink-soft">
                  {report.issues.map((issue) => (
                    <li key={issue}>{translateStripeReadinessIssue(issue)}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
