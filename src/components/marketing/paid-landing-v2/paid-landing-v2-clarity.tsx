"use client";

import { useId, useState } from "react";
import { ScriptureChip } from "@/components/marketing/paid-landing/conversation-language";
import { cn } from "@/lib/utils";

/**
 * Clarity board as the visual signature of the V2 landing.
 * Marketing visualization of how a conversation organizes tension —
 * not a literal product UI capture.
 */

const BEFORE_FRAGMENTS = [
  { text: "quero perdoar", className: "left-[4%] top-[12%] w-[9.5rem] -rotate-[3deg]" },
  { text: "não confio", className: "right-[6%] top-[18%] w-[7.5rem] rotate-[2.5deg]" },
  { text: "me sinto culpado", className: "left-[10%] top-[38%] w-[10rem] rotate-[1deg]" },
  { text: "medo de repetir", className: "right-[8%] top-[42%] w-[9rem] -rotate-[2deg]" },
  { text: "raiva", className: "left-[18%] top-[62%] w-[5.5rem] rotate-[3deg]" },
  { text: "preciso de limites", className: "right-[12%] top-[66%] w-[10rem] -rotate-[1.5deg]" },
] as const;

const AFTER = {
  desire: "Deixar a raiva para trás.",
  reality: "A confiança ainda não foi reconstruída.",
  responsibility: "Perdão não elimina prudência e limites.",
  scriptures: ["Efésios 4:31–32", "Colossenses 3:13", "Romanos 12:18"] as const,
  nextStep:
    "Escreva o limite que precisaria ser respeitado antes de considerar uma aproximação.",
} as const;

function BeforePanel({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative min-h-[17.5rem] overflow-hidden rounded-[1.25rem] border border-ink/20 bg-ink px-3.5 py-3.5 text-sand-50 sm:min-h-[19rem] sm:px-4 sm:py-4",
        className,
      )}
    >
      <p className="relative z-10 text-[10px] font-medium uppercase tracking-[0.16em] text-sand-50/50">
        Antes
      </p>
      <p className="relative z-10 mt-1 font-sans text-sm font-medium text-sand-50/75">
        Tudo misturado
      </p>

      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-[8%] top-[28%] h-px w-[70%] rotate-[-8deg] bg-sand-50/10" />
        <div className="absolute left-[18%] top-[48%] h-px w-[55%] rotate-[6deg] bg-sand-50/10" />
        <div className="absolute left-[12%] top-[68%] h-px w-[62%] rotate-[-4deg] bg-sand-50/8" />
      </div>

      <ul className="relative mt-3 min-h-[11.5rem] sm:min-h-[12.5rem]">
        {BEFORE_FRAGMENTS.map((fragment) => (
          <li
            key={fragment.text}
            className={cn(
              "absolute rounded-md border border-sand-50/12 bg-sand-50/[0.08] px-2.5 py-1.5 text-[0.78rem] leading-tight text-sand-50/78 shadow-[0_8px_18px_-14px_rgba(0,0,0,0.8)] sm:text-[0.82rem]",
              fragment.className,
            )}
          >
            {fragment.text}
          </li>
        ))}
      </ul>

      <p className="sr-only">
        Sentimentos, fatos, medo e limites misturados:{" "}
        {BEFORE_FRAGMENTS.map((f) => f.text).join(", ")}.
      </p>
    </div>
  );
}

function AfterPanel({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.25rem] border border-gold/35 bg-sand-50 px-3.5 py-3.5 shadow-[0_22px_50px_-34px_rgba(44,36,28,0.55)] sm:px-5 sm:py-5",
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

      <dl className="mt-3 space-y-2.5 text-sm leading-snug">
        <div className="border-b border-ink/8 pb-2.5">
          <dt className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink-soft">
            Desejo
          </dt>
          <dd className="mt-0.5 text-ink">{AFTER.desire}</dd>
        </div>
        <div className="border-b border-ink/8 pb-2.5">
          <dt className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink-soft">
            Realidade
          </dt>
          <dd className="mt-0.5 text-ink">{AFTER.reality}</dd>
        </div>
        <div className="rounded-lg bg-wine/[0.05] px-2.5 py-2">
          <dt className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink-soft">
            Responsabilidade
          </dt>
          <dd className="mt-0.5 text-ink">{AFTER.responsibility}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink-soft">
            Escrituras
          </dt>
          <dd className="mt-1.5 flex flex-wrap gap-1.5">
            {AFTER.scriptures.map((ref, i) => (
              <ScriptureChip key={ref} withIcon={i === 0}>
                {ref}
              </ScriptureChip>
            ))}
          </dd>
        </div>
        <div className="rounded-lg border border-gold/25 bg-sand-100/80 px-2.5 py-2">
          <dt className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink-soft">
            Próximo passo
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
  const [mode, setMode] = useState<"antes" | "depois">("antes");
  const toggleLabelId = useId();

  return (
    <section
      id="clareza-v2"
      className="relative scroll-mt-6 overflow-hidden bg-sand-50 sm:scroll-mt-8"
      aria-labelledby="clareza-v2-heading"
    >
      <div className="relative mx-auto max-w-6xl px-4 pb-7 pt-2 sm:px-6 sm:pb-10 sm:pt-3 lg:pb-12">
        <h2
          id="clareza-v2-heading"
          className="max-w-2xl font-sans text-[1.35rem] font-semibold leading-snug tracking-tight text-ink sm:text-[1.7rem] lg:text-[1.95rem]"
        >
          Do emaranhado à clareza possível.
        </h2>

        {/* Desktop: side by side */}
        <div className="mt-4 hidden gap-5 md:grid md:grid-cols-2 lg:mt-6 lg:gap-6">
          <BeforePanel />
          <AfterPanel />
        </div>

        {/* Mobile: accessible Antes/Depois toggle — Antes first for tension */}
        <div className="mt-3.5 md:hidden">
          <p id={toggleLabelId} className="sr-only">
            Alternar entre estado misturado e organizado
          </p>
          <MobileToggle mode={mode} onChange={setMode} labelId={toggleLabelId} />
          <div className="relative mt-3 grid">
            <div
              className={cn(
                "col-start-1 row-start-1 transition-opacity duration-300 motion-reduce:transition-none",
                mode === "antes" ? "opacity-100" : "pointer-events-none invisible opacity-0",
              )}
              aria-hidden={mode !== "antes"}
            >
              <BeforePanel className="h-full" />
            </div>
            <div
              className={cn(
                "col-start-1 row-start-1 transition-opacity duration-300 motion-reduce:transition-none",
                mode === "depois" ? "opacity-100" : "pointer-events-none invisible opacity-0",
              )}
              aria-hidden={mode !== "depois"}
            >
              <AfterPanel className="h-full" />
            </div>
          </div>
        </div>

        <p className="mt-5 max-w-xl border-t border-ink/10 pt-4 font-sans text-[0.95rem] leading-snug text-ink sm:mt-7 sm:text-base">
          A reflexão parte dos detalhes da sua situação — e continua de onde
          você parou.
        </p>
      </div>
    </section>
  );
}
