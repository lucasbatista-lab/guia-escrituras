"use client";

import { useId, useState } from "react";
import { ScriptureChip } from "@/components/marketing/paid-landing/conversation-language";
import { cn } from "@/lib/utils";

/**
 * Clarity board as the visual signature of the V2 landing.
 * Marketing visualization of how a conversation organizes tension —
 * not a literal product screenshot.
 */

const BEFORE_FRAGMENTS = [
  "quero perdoar",
  "não confio",
  "me sinto culpado",
  "tenho medo de repetir",
  "raiva ainda aqui",
  "preciso de limites",
] as const;

const AFTER = {
  desire: "Deixar a raiva para trás.",
  reality: "A confiança ainda não foi reconstruída.",
  responsibility: "Perdão não elimina prudência e limites.",
  scriptures: ["Efésios 4:31–32", "Colossenses 3:13", "Romanos 12:18"] as const,
  nextStep:
    "Escreva o limite que precisaria ser respeitado antes de considerar uma aproximação.",
} as const;

const BEATS = [
  "Parte da sua situação.",
  "Faz perguntas antes de responder.",
  "Mantém o fio para você continuar.",
] as const;

function BeforePanel({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.4rem] border border-ink/15 bg-ink px-4 py-5 text-sand-50 sm:px-5 sm:py-6",
        className,
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-sand-50/55">
        Antes
      </p>
      <p className="mt-2 font-sans text-sm font-medium text-sand-50/85">
        Tudo misturado
      </p>
      <ul className="mt-5 flex flex-wrap gap-2">
        {BEFORE_FRAGMENTS.map((fragment, index) => (
          <li
            key={fragment}
            className={cn(
              "rounded-full border border-sand-50/15 bg-sand-50/[0.07] px-3 py-1.5 text-[0.82rem] text-sand-50/80",
              index % 3 === 1 && "rotate-[-2deg]",
              index % 3 === 2 && "rotate-[1.5deg] opacity-80",
            )}
          >
            {fragment}
          </li>
        ))}
      </ul>
      <p className="mt-6 max-w-[16rem] text-[0.8rem] leading-snug text-sand-50/55">
        Sentimentos, fatos, medo, culpa e limites no mesmo emaranhado.
      </p>
    </div>
  );
}

function AfterPanel({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.4rem] border border-gold/35 bg-sand-50 px-4 py-5 shadow-[0_22px_50px_-34px_rgba(44,36,28,0.55)] sm:px-5 sm:py-6",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-wine">
          Depois
        </p>
        <span className="text-[10px] uppercase tracking-[0.12em] text-ink-soft">
          organizado
        </span>
      </div>

      <dl className="mt-4 space-y-3.5 text-sm leading-snug">
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-soft">
            Desejo
          </dt>
          <dd className="mt-0.5 text-ink">{AFTER.desire}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-soft">
            Realidade
          </dt>
          <dd className="mt-0.5 text-ink">{AFTER.reality}</dd>
        </div>
        <div className="rounded-xl border border-wine/20 bg-wine/[0.04] px-3 py-2.5">
          <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-soft">
            Responsabilidade
          </dt>
          <dd className="mt-0.5 text-ink">{AFTER.responsibility}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-soft">
            Escrituras para considerar
          </dt>
          <dd className="mt-1.5 flex flex-wrap gap-1.5">
            {AFTER.scriptures.map((ref, i) => (
              <ScriptureChip key={ref} withIcon={i === 0}>
                {ref}
              </ScriptureChip>
            ))}
          </dd>
        </div>
        <div className="rounded-xl border border-gold/30 bg-sand-100/90 px-3 py-2.5">
          <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-soft">
            Próximo passo possível
          </dt>
          <dd className="mt-0.5 text-ink">{AFTER.nextStep}</dd>
        </div>
      </dl>
    </div>
  );
}

function MobileToggle({
  mode,
  onChange,
  labelId,
}: {
  mode: "antes" | "depois";
  onChange: (mode: "antes" | "depois") => void;
  labelId: string;
}) {
  return (
    <div
      className="inline-flex rounded-full border border-ink/15 bg-sand-100 p-1"
      role="group"
      aria-labelledby={labelId}
    >
      {(["antes", "depois"] as const).map((value) => {
        const selected = mode === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(value)}
            className={cn(
              "min-h-11 min-w-[5.5rem] rounded-full px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              selected
                ? "bg-ink text-sand-50 shadow-sm"
                : "text-ink-soft hover:text-ink",
            )}
          >
            {value === "antes" ? "Antes" : "Depois"}
          </button>
        );
      })}
    </div>
  );
}

export function PaidLandingV2Clarity() {
  const [mode, setMode] = useState<"antes" | "depois">("depois");
  const toggleLabelId = useId();

  return (
    <section
      id="clareza-v2"
      className="relative scroll-mt-6 overflow-hidden bg-sand-50 sm:scroll-mt-8"
      aria-labelledby="clareza-v2-heading"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-sand-100/80 to-transparent"
      />
      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:py-16">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-wine">
          Como a conversa ajuda a organizar
        </p>
        <h2
          id="clareza-v2-heading"
          className="mt-2 max-w-2xl font-sans text-[1.55rem] font-semibold leading-snug tracking-tight text-ink sm:text-[1.85rem] lg:text-[2.15rem]"
        >
          Do emaranhado à clareza possível.
        </h2>
        <p className="mt-2 text-sm text-ink-soft">Exemplo ilustrativo</p>

        {/* Desktop: side by side */}
        <div className="mt-7 hidden gap-5 md:grid md:grid-cols-2 lg:mt-9 lg:gap-6">
          <BeforePanel />
          <AfterPanel />
        </div>

        {/* Mobile: accessible Antes/Depois toggle */}
        <div className="mt-6 md:hidden">
          <p id={toggleLabelId} className="sr-only">
            Alternar entre estado misturado e organizado
          </p>
          <MobileToggle mode={mode} onChange={setMode} labelId={toggleLabelId} />
          <div className="relative mt-4 min-h-[22rem]">
            <div
              className={cn(
                "transition-opacity duration-300 motion-reduce:transition-none",
                mode === "antes" ? "opacity-100" : "pointer-events-none absolute inset-0 opacity-0",
              )}
              aria-hidden={mode !== "antes"}
            >
              <BeforePanel />
            </div>
            <div
              className={cn(
                "transition-opacity duration-300 motion-reduce:transition-none",
                mode === "depois" ? "opacity-100" : "pointer-events-none absolute inset-0 opacity-0",
              )}
              aria-hidden={mode !== "depois"}
            >
              <AfterPanel />
            </div>
          </div>
        </div>

        <ol className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-3 sm:gap-4">
          {BEATS.map((beat, index) => (
            <li key={beat} className="flex gap-3 sm:block">
              <span
                aria-hidden
                className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-wine/10 font-sans text-xs font-semibold text-wine sm:mb-2 sm:mt-0"
              >
                {index + 1}
              </span>
              <p className="font-sans text-[0.95rem] font-medium leading-snug text-ink">
                {beat}
              </p>
            </li>
          ))}
        </ol>

        <p className="mt-6 max-w-2xl text-[0.95rem] leading-snug text-ink-soft sm:mt-7 sm:text-base">
          Conteúdos gerais partem de um tema. Aqui, a reflexão parte dos
          detalhes da sua situação.
        </p>
      </div>
    </section>
  );
}
