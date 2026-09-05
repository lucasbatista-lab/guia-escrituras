"use client";

import { useState } from "react";
import { TrackingLink } from "@/components/marketing/tracking-link";
import { PublicConversionBeacon } from "@/components/marketing/public-conversion-beacon";
import { Button } from "@/components/ui/button";
import type { PublicConversionEventName } from "@/lib/acquisition/public-event-types";
import { trackPublicConversion } from "@/lib/acquisition/public-events-client";
import {
  ACQUISITION_DEMO_SCENARIO_IDS,
  DEMO_SCENARIOS,
  getDemoScenariosByIds,
  type DemoScenario,
} from "@/lib/marketing/demo-scenarios";
import { cn } from "@/lib/utils";

export function ChatDemo({
  scenarios,
  title = "Escolha um exemplo",
  subtitle,
  ctaHref = "/planos",
  ctaLabel = "Ver os planos",
  ctaConversionEvent = "plans_cta_clicked",
  trackTopicSelection = true,
  className,
  headingId,
}: {
  scenarios?: DemoScenario[];
  title?: string;
  subtitle?: string;
  ctaHref?: string;
  ctaLabel?: string;
  ctaConversionEvent?: PublicConversionEventName;
  trackTopicSelection?: boolean;
  className?: string;
  headingId?: string;
}) {
  const list =
    scenarios && scenarios.length > 0
      ? scenarios
      : DEMO_SCENARIOS;
  const [activeId, setActiveId] = useState(list[0]!.id);
  const active = list.find((s) => s.id === activeId) ?? list[0]!;

  return (
    <div
      className={cn(
        "animate-fade-up-delayed overflow-hidden rounded-[1.75rem] border border-ink/15 bg-card/95 shadow-[0_24px_70px_-38px_rgba(44,36,28,0.6)] backdrop-blur-sm",
        className,
      )}
      aria-label="Demonstração interativa do chat"
    >
      <PublicConversionBeacon event="product_demo_viewed" observe />
      <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-ink px-4 py-3 text-sand-50">
        <div>
          <p className="font-display text-sm">Amém Chat</p>
          <p id={headingId} className="text-[11px] text-sand-200">
            {title}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-sand-50/15 bg-sand-50/10 px-2.5 py-1 text-[10px] uppercase tracking-wide text-sand-100">
          exemplo ilustrativo
        </span>
      </div>

      <div
        className="flex snap-x gap-2 overflow-x-auto border-b border-border/60 px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label="Escolha um exemplo"
      >
        {list.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            onClick={() => {
              setActiveId(scenario.id);
              if (trackTopicSelection) {
                trackPublicConversion("product_demo_topic_selected");
              }
            }}
            className={cn(
              "min-h-10 shrink-0 snap-start rounded-full px-3 py-2 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeId === scenario.id
                ? "bg-wine text-sand-50 shadow-sm"
                : "border border-border/70 bg-sand-50 text-ink-soft hover:text-ink",
            )}
            aria-pressed={activeId === scenario.id}
          >
            {scenario.label}
          </button>
        ))}
      </div>

      <div
        key={active.id}
        className="space-y-4 bg-[radial-gradient(circle_at_100%_0%,rgba(198,160,90,0.1),transparent_38%)] p-4 font-chat text-[15px] leading-relaxed motion-safe:animate-fade-up sm:p-5"
      >
        <div className="ml-auto max-w-[92%] rounded-2xl rounded-br-md bg-ink px-4 py-3 text-sand-50 sm:max-w-[85%]">
          {active.prompt}
        </div>
        <div className="max-w-[96%] space-y-3 rounded-2xl rounded-bl-md border border-border/80 bg-sand-50/95 px-4 py-3 text-ink sm:max-w-[92%]">
          <p>{active.welcome}</p>
          <div className="flex flex-wrap gap-1.5">
            <span className="sr-only">Referências ·</span>
            {active.references.map((reference) => (
              <span
                key={reference}
                className="rounded-full bg-sand-100 px-2.5 py-1 font-sans text-[11px] font-medium text-ink-soft"
              >
                {reference}
              </span>
            ))}
          </div>
          <p>
            <span className="font-medium text-ink">Interpretação: </span>
            {active.interpretation}
          </p>
          <div>
            <p className="text-sm font-medium text-ink">Próximos passos possíveis</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-ink-soft">
              {active.actions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          </div>
          <p className="text-sm italic text-ink-soft">{active.followUp}</p>
        </div>
        <p className="text-center font-sans text-[11px] text-ink-soft">
          Exemplo ilustrativo, sem dados reais. Não é voz divina.
        </p>
      </div>

      <div className="border-t border-border/70 px-4 py-4 sm:px-5">
        <p className="text-sm text-ink-soft">
          {subtitle ??
            "No produto, você pode responder, continuar a conversa e encontrá-la depois no histórico."}
        </p>
        <Button
          asChild
          className="mt-3 min-h-11 w-full bg-ink hover:bg-ink/90 sm:w-auto"
        >
          <TrackingLink href={ctaHref} conversionEvent={ctaConversionEvent}>
            {ctaLabel}
          </TrackingLink>
        </Button>
      </div>
    </div>
  );
}

/** Campaign landing: three acquisition themes, CTA toward plans. */
export function AcquisitionChatDemo({
  plansHref = "/planos",
  className,
  headingId,
}: {
  plansHref?: string;
  className?: string;
  headingId?: string;
}) {
  return (
    <ChatDemo
      scenarios={getDemoScenariosByIds(ACQUISITION_DEMO_SCENARIO_IDS)}
      title="Escolha um exemplo"
      subtitle="Para refletir sobre a sua situação, conheça os planos. No produto, a conversa pode continuar no Histórico e nas Jornadas."
      ctaHref={plansHref}
      ctaLabel="Conhecer os planos"
      ctaConversionEvent="plans_cta_clicked"
      trackTopicSelection
      className={className}
      headingId={headingId}
    />
  );
}
