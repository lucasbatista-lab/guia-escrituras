/**
 * Static editorial proof of Conversar — ZERO LLM / API calls.
 * Used on SoftPaywall and marketing. Never user-private content.
 */

export type ConversarProofSnippet = {
  situation: string;
  welcome: string;
  references: string;
  step: string;
};

/** Curated static example — not a user conversation. */
export const CONVERSAR_PROOF_SNIPPET: ConversarProofSnippet = {
  situation:
    "Estou com medo de tomar uma decisão errada e me arrepender.",
  welcome:
    "Esse medo é humano — e não significa falta de fé. Dá para organizar o coração sem fingir certeza absoluta.",
  references: "Tiago 1:5 · Provérbios 3:5-6",
  step: "Escreva em uma frase o que mais pesa — e ore só isso hoje.",
};

export function ConversarProofMini({
  className = "",
}: {
  className?: string;
}) {
  const s = CONVERSAR_PROOF_SNIPPET;
  return (
    <figure
      className={`overflow-hidden rounded-[16px] border border-border/60 bg-[color:var(--amem-recess,#F3EFE8)]/70 ${className}`}
      aria-label="Exemplo ilustrativo de Conversar"
    >
      <div className="border-b border-border/40 px-3.5 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-wine">
          Exemplo · não é a sua conversa
        </p>
        <p className="mt-1.5 text-[13px] leading-snug text-ink-soft">
          “{s.situation}”
        </p>
      </div>
      <div className="space-y-2 px-3.5 py-3">
        <p className="text-[13px] leading-snug text-ink">{s.welcome}</p>
        <p className="text-[11px] font-medium tracking-wide text-wine">
          {s.references}
        </p>
        <p className="text-[12px] leading-snug text-ink-soft">
          Próximo passo · {s.step}
        </p>
      </div>
    </figure>
  );
}
