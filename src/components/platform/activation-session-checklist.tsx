"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  EMPTY_ACTIVATION_CHECKLIST,
  getActivationChecklist,
  markActivationStep,
  planFirstStepHint,
  subscribeActivationChecklist,
} from "@/lib/activation/session-checklist";
import { canUseReadingJourneys } from "@/lib/journeys/entitlement";
import type { PlanKey } from "@/lib/entitlements";

export function ActivationSessionChecklist({
  planKey,
}: {
  planKey: PlanKey | null;
}) {
  const state = useSyncExternalStore(
    subscribeActivationChecklist,
    getActivationChecklist,
    () => EMPTY_ACTIVATION_CHECKLIST,
  );
  const hint = planFirstStepHint(planKey);
  const journeysOk = canUseReadingJourneys(planKey);

  const relevantDone =
    Number(state.first_chat) +
    Number(journeysOk && state.explore_journeys) +
    Number(state.know_help);
  const relevantTotal = journeysOk ? 3 : 2;
  const allDone = relevantDone >= relevantTotal;
  if (allDone) return null;

  return (
    <section
      aria-labelledby="activation-checklist-heading"
      className="rounded-2xl border border-border/70 bg-card/60 p-5"
    >
      <h2
        id="activation-checklist-heading"
        className="font-display text-lg text-ink"
      >
        {hint.title}
      </h2>
      <p className="mt-1 text-sm text-ink-soft">{hint.body}</p>
      <p className="mt-2 text-xs text-ink-soft" role="status">
        {relevantDone} de {relevantTotal} passos de ativação nesta sessão · só
        neste navegador
      </p>
      <ul className="mt-4 space-y-2 text-sm">
        <li className="flex flex-wrap items-center gap-2">
          <span aria-hidden>{state.first_chat ? "✓" : "○"}</span>
          <span className={state.first_chat ? "text-ink-soft" : "text-ink"}>
            Abrir o chat e escrever sua situação
          </span>
          {!state.first_chat ? (
            <Button asChild variant="outline" className="min-h-11">
              <Link
                href={hint.href}
                onClick={() => {
                  markActivationStep("first_chat");
                }}
              >
                {hint.cta}
              </Link>
            </Button>
          ) : null}
        </li>
        {journeysOk ? (
          <li className="flex flex-wrap items-center gap-2">
            <span aria-hidden>{state.explore_journeys ? "✓" : "○"}</span>
            <span
              className={
                state.explore_journeys ? "text-ink-soft" : "text-ink"
              }
            >
              Conhecer as Jornadas de leitura
            </span>
            {!state.explore_journeys ? (
              <Button asChild variant="outline" className="min-h-11">
                <Link
                  href="/jornadas"
                  onClick={() => {
                    markActivationStep("explore_journeys");
                  }}
                >
                  Ver jornadas
                </Link>
              </Button>
            ) : null}
          </li>
        ) : null}
        <li className="flex flex-wrap items-center gap-2">
          <span aria-hidden>{state.know_help ? "✓" : "○"}</span>
          <span className={state.know_help ? "text-ink-soft" : "text-ink"}>
            Saber onde pedir ajuda técnica (não pastoral)
          </span>
          {!state.know_help ? (
            <Button asChild variant="outline" className="min-h-11">
              <Link
                href="/ajuda"
                onClick={() => {
                  markActivationStep("know_help");
                }}
              >
                Abrir ajuda
              </Link>
            </Button>
          ) : null}
        </li>
      </ul>
    </section>
  );
}
