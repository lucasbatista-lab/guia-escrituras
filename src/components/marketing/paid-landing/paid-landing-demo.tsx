import {
  ContinuityMarker,
  ContinuityThread,
  ConversationEyebrow,
  GuideBubble,
  ScriptureChip,
  UserBubble,
} from "./conversation-language";

/**
 * Compact product-thread demonstration — no live AI calls.
 * Shows tension → clarifying question → clarity board (product surface).
 */
export function PaidLandingDemo() {
  return (
    <div className="mx-auto max-w-xl">
      <ConversationEyebrow>Exemplo ilustrativo</ConversationEyebrow>
      <h2
        id="demonstracao-heading"
        className="mt-1.5 font-display text-xl text-ink sm:text-2xl"
      >
        Da tensão à clareza possível
      </h2>

      <ContinuityThread className="mt-3.5">
        <div className="relative pl-8 sm:pl-9">
          <span
            aria-hidden
            className="absolute left-0 top-1.5 flex size-[23px] items-center justify-center rounded-full border border-gold/45 bg-sand-50 sm:size-[27px]"
          >
            <span className="size-1.5 rounded-full bg-wine sm:size-2" />
          </span>
          <UserBubble className="max-w-[90%] px-3 py-2 text-[0.9rem] sm:text-[0.95rem]">
            Eu quero perdoar alguém da minha família, mas não sei se perdoar
            significa voltar a conviver.
          </UserBubble>
        </div>

        <div className="relative pl-8 sm:pl-9">
          <span
            aria-hidden
            className="absolute left-0 top-1.5 flex size-[23px] items-center justify-center rounded-full border border-gold/45 bg-sand-50 sm:size-[27px]"
          >
            <span className="size-1.5 rounded-full bg-wine sm:size-2" />
          </span>
          <GuideBubble className="max-w-[92%] px-3 py-2.5 text-[0.9rem] sm:text-[0.95rem]">
            O que você deseja deixar para trás — e o que ainda precisa ser
            protegido antes de pensar em uma aproximação?
          </GuideBubble>
        </div>

        <div className="relative pl-8 sm:pl-9">
          <span
            aria-hidden
            className="absolute left-0 top-1.5 flex size-[23px] items-center justify-center rounded-full border border-gold/45 bg-sand-50 sm:size-[27px]"
          >
            <span className="size-1.5 rounded-full bg-wine sm:size-2" />
          </span>
          <UserBubble className="max-w-[88%] px-3 py-2 text-[0.9rem] sm:text-[0.95rem]">
            Quero parar de carregar raiva, mas ainda não confio que a situação
            será diferente.
          </UserBubble>
        </div>
      </ContinuityThread>

      <div
        className="mt-4 overflow-hidden rounded-2xl border border-ink/12 bg-sand-50 shadow-[0_18px_44px_-32px_rgba(44,36,28,0.55)]"
        aria-labelledby="clareza-heading"
      >
        <div className="flex items-center justify-between border-b border-border/70 bg-card/80 px-3.5 py-2.5">
          <p
            id="clareza-heading"
            className="font-display text-sm text-ink sm:text-base"
          >
            O que está em jogo
          </p>
          <span className="text-[10px] uppercase tracking-[0.12em] text-ink-soft">
            clareza
          </span>
        </div>
        <div className="space-y-3 px-3.5 py-3.5 text-sm leading-snug">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-white/70 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-soft">
                Desejo
              </p>
              <p className="mt-0.5 text-ink">Deixar a raiva para trás.</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-white/70 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-soft">
                Realidade
              </p>
              <p className="mt-0.5 text-ink">
                A confiança ainda não foi reconstruída.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-wine/20 bg-wine/[0.04] px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-soft">
              Responsabilidade
            </p>
            <p className="mt-0.5 text-ink">
              Perdoar não elimina prudência e limites.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <ScriptureChip withIcon>Efésios 4:31–32</ScriptureChip>
            <ScriptureChip>Colossenses 3:13</ScriptureChip>
            <ScriptureChip>Romanos 12:18</ScriptureChip>
          </div>
          <div className="rounded-xl border border-gold/30 bg-sand-100/80 px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-soft">
              Próximo passo possível
            </p>
            <p className="mt-0.5 text-ink">
              Escreva o limite que precisaria ser respeitado antes de uma nova
              aproximação.
            </p>
          </div>
          <p className="text-[12px] leading-snug text-ink-soft">
            Sem ordem divina — a decisão continua sendo sua.
          </p>
        </div>
      </div>

      <div className="mt-3.5 space-y-1 border-t border-border/50 pt-3.5">
        <p className="text-sm font-medium text-ink">
          Conteúdos gerais partem de um tema. Aqui partimos da sua situação.
        </p>
        <ContinuityMarker className="mt-1">
          Retome no Histórico quando voltar.
        </ContinuityMarker>
      </div>
    </div>
  );
}
