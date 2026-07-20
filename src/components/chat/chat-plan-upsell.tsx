"use client";

import { useEffect, useRef } from "react";
import type { PlanUpsellSuggestion } from "@/lib/marketing/plan-upsell";
import type { PlanKey } from "@/lib/entitlements";
import { PlanConversionLink } from "@/components/marketing/plan-conversion-link";

async function recordViewed(
  event: "deep_upsell_viewed" | "usage_limit_upsell_viewed",
  targetPlanKey: PlanKey,
) {
  try {
    await fetch("/api/account/plan-interest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify({ event, origin: "chat_panel", targetPlanKey }),
    });
  } catch {
    // Non-blocking.
  }
}

export function ChatPlanUpsell({
  suggestion,
}: {
  suggestion: PlanUpsellSuggestion;
}) {
  const viewed = useRef(false);
  const targetPlanKey: PlanKey =
    suggestion.kind === "caminho" ? "caminho" : "profundo";
  const viewEvent =
    suggestion.kind === "profundo" ? "deep_upsell_viewed" : "usage_limit_upsell_viewed";

  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    void recordViewed(viewEvent, targetPlanKey);
  }, [viewEvent, targetPlanKey]);

  return (
    <div
      className="mb-3 rounded-xl border border-border/70 bg-sand-50/80 px-3 py-3"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm font-medium text-ink">{suggestion.title}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">
        {suggestion.body}
      </p>
      <p className="mt-2 text-xs text-ink-soft">
        A troca automática entre planos ainda não está disponível — você pode
        comparar e, quando estiver pronta, concluir pela conta.
      </p>
      <PlanConversionLink
        href={suggestion.href}
        event="upgrade_interest_clicked"
        targetPlanKey={targetPlanKey}
        origin={viewEvent}
        className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-ink underline underline-offset-4 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {suggestion.ctaLabel}
      </PlanConversionLink>
    </div>
  );
}

export function DeepUpsellHint() {
  return (
    <p className="mb-3 text-xs leading-relaxed text-ink-soft">
      Aprofundar pede uma análise mais extensa da situação, com mais contexto,
      conexões bíblicas e próximos passos — disponível no Profundo.{" "}
      <PlanConversionLink
        href="/planos#aprofundar"
        event="upgrade_interest_clicked"
        targetPlanKey="profundo"
        origin="deep_not_entitled"
        className="text-ink underline underline-offset-4 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        Conhecer o Profundo
      </PlanConversionLink>
    </p>
  );
}
