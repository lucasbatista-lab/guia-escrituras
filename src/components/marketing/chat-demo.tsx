"use client";

import { useState } from "react";
import { TrackingLink } from "@/components/marketing/tracking-link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SCENARIOS = [
  {
    id: "ansiedade",
    label: "Ansiedade",
    prompt: "Estou ansioso com o que ainda não controla. Como posso buscar paz?",
    body: "À luz de Filipenses 4:6-7, o convite é apresentar a preocupação em oração e dar o próximo passo com firmeza serena — sem carregar tudo sozinho.",
    reference: "Filipenses 4:6-7",
  },
  {
    id: "decisoes",
    label: "Decisões",
    prompt: "Preciso tomar uma decisão difícil. Por onde começar?",
    body: "Com Tiago 1:5, a orientação é pedir sabedoria com humildade, consultar pessoas de confiança e avançar um passo claro de cada vez.",
    reference: "Tiago 1:5",
  },
  {
    id: "familia",
    label: "Família",
    prompt: "Estou ferido em uma conversa em família. Como responder com cuidado?",
    body: "Em Efésios 4:31-32, o caminho é soltar a amargura, falar a verdade com mansidão e buscar reconciliação sem negar o que doeu.",
    reference: "Efésios 4:31-32",
  },
  {
    id: "perdao",
    label: "Perdão",
    prompt: "Quero perdoar, mas ainda dói. O que as Escrituras iluminam?",
    body: "Colossenses 3:13 lembra que perdoar é um processo de soltar a dívida, não de negar a ferida. Comece com honestidade diante de Deus e um gesto pequeno de paz.",
    reference: "Colossenses 3:13",
  },
  {
    id: "recomecos",
    label: "Recomeços",
    prompt: "Sinto que falhei e preciso recomeçar. Há esperança prática?",
    body: "Em Lamentações 3:22-23, as misericórdias se renovam. Nomeie o que precisa mudar, peça força e dê um passo concreto hoje.",
    reference: "Lamentações 3:22-23",
  },
] as const;

export function ChatDemo() {
  const [activeId, setActiveId] = useState<(typeof SCENARIOS)[number]["id"]>(
    "ansiedade",
  );
  const active = SCENARIOS.find((s) => s.id === activeId) ?? SCENARIOS[0];

  return (
    <div
      id="demonstracao"
      className="animate-fade-up-delayed overflow-hidden rounded-2xl border border-border/80 bg-card/80 shadow-sm backdrop-blur-sm"
      aria-label="Demonstração interativa do chat"
    >
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-ink">Exemplo interativo</p>
          <p className="text-xs text-ink-soft">
            Sem chamada à API · respostas ilustrativas
          </p>
        </div>
        <span className="rounded-md bg-sand-200/80 px-2 py-1 text-[11px] uppercase tracking-wide text-ink-soft">
          exemplo
        </span>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border/60 px-4 py-3">
        {SCENARIOS.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            onClick={() => setActiveId(scenario.id)}
            className={cn(
              "min-h-9 rounded-md px-2.5 py-1.5 text-xs transition",
              activeId === scenario.id
                ? "bg-ink text-sand-50"
                : "bg-sand-100 text-ink-soft hover:text-ink",
            )}
            aria-pressed={activeId === scenario.id}
          >
            {scenario.label}
          </button>
        ))}
      </div>

      <div
        key={active.id}
        className="space-y-4 p-4 font-chat text-[15px] leading-relaxed motion-safe:animate-fade-up sm:p-5"
      >
        <p className="text-xs text-ink-soft">
          Isto é um exemplo local — não uma conversa real nem voz divina.
        </p>
        <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-3 text-sand-50">
          {active.prompt}
        </div>
        <div className="max-w-[92%] space-y-3 rounded-2xl rounded-bl-md border border-border/80 bg-sand-50/90 px-4 py-3 text-ink">
          <p>{active.body}</p>
          <p className="rounded-md bg-card/80 px-2.5 py-1.5 text-xs font-medium text-ink-soft">
            Referência: {active.reference}
          </p>
        </div>
      </div>

      <div className="border-t border-border/70 px-4 py-4 sm:px-5">
        <p className="text-sm text-ink-soft">
          Gostou do tom? Escolha um plano para conversar de verdade — com a
          tradição que você escolher.
        </p>
        <Button asChild className="mt-3 min-h-11 w-full bg-ink hover:bg-ink/90 sm:w-auto">
          <TrackingLink href="/planos">Escolher meu plano</TrackingLink>
        </Button>
      </div>
    </div>
  );
}
