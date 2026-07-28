"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type CheckState = {
  status: "ok" | "unavailable";
  latencyMs: number | null;
};

type CheckResult = CheckState | null;

const TIMEOUT_MS = 5000;

async function checkEndpoint(url: string): Promise<CheckState> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      credentials: "same-origin",
      signal: controller.signal,
      cache: "no-store",
    });
    const latencyMs = Date.now() - started;
    if (!res.ok) return { status: "unavailable", latencyMs };
    return { status: "ok", latencyMs };
  } catch {
    // Timeout, network error, or abort — never presented as automatic "down".
    return { status: "unavailable", latencyMs: null };
  } finally {
    clearTimeout(timer);
  }
}

function labelFor(result: CheckResult): string {
  if (!result) return "Ainda não verificado";
  if (result.status === "ok") {
    return result.latencyMs != null ? `OK · ${result.latencyMs} ms` : "OK";
  }
  return "Indisponível para verificação";
}

function dotClass(result: CheckResult): string {
  if (!result) return "bg-border";
  return result.status === "ok" ? "bg-emerald-600" : "bg-amber-600";
}

export function HealthStatusPanel() {
  const [loading, setLoading] = useState(false);
  const [app, setApp] = useState<CheckResult>(null);
  const [db, setDb] = useState<CheckResult>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  async function onCheck() {
    setLoading(true);
    try {
      const [appResult, dbResult] = await Promise.all([
        checkEndpoint("/api/health"),
        checkEndpoint("/api/health/db"),
      ]);
      setApp(appResult);
      setDb(dbResult);
      setCheckedAt(new Date().toISOString());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border/70 bg-card/60 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-soft">
          Consulta sob demanda com timeout de {TIMEOUT_MS / 1000}s. Falha ou
          timeout aparece como &quot;indisponível para verificação&quot; — não
          é o mesmo que confirmar que o serviço está fora do ar.
        </p>
        <Button
          type="button"
          onClick={() => void onCheck()}
          disabled={loading}
          className="min-h-11 bg-ink hover:bg-ink/90"
        >
          {loading ? "Verificando…" : "Verificar /api/health"}
        </Button>
      </div>

      <div aria-live="polite" aria-busy={loading} className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${dotClass(app)}`}
            aria-hidden
          />
          <span className="text-ink">App (/api/health):</span>
          <span className="text-ink-soft">{labelFor(app)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${dotClass(db)}`}
            aria-hidden
          />
          <span className="text-ink">Banco (/api/health/db):</span>
          <span className="text-ink-soft">{labelFor(db)}</span>
        </div>
        {checkedAt ? (
          <p className="text-xs text-ink-soft">
            Última verificação: {new Date(checkedAt).toLocaleString("pt-BR")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
