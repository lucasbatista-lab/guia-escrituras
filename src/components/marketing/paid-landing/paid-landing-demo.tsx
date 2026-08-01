import {
  ContinuityMarker,
  ContinuityThread,
  ConversationEyebrow,
  GuideBubble,
  NextStepBlock,
  ScriptureChip,
  UserBubble,
} from "./conversation-language";

/**
 * Compact product-thread demonstration — no live AI calls.
 * Four movements, chat appearance, short close that states the mechanism.
 */
export function PaidLandingDemo() {
  return (
    <div className="mx-auto max-w-xl">
      <ConversationEyebrow>Exemplo ilustrativo</ConversationEyebrow>
      <h2
        id="demonstracao-heading"
        className="mt-1.5 font-display text-xl text-ink sm:text-2xl"
      >
        Como a conversa acontece
      </h2>

      <ContinuityThread className="mt-4">
        <div className="relative pl-8 sm:pl-9">
          <span
            aria-hidden
            className="absolute left-0 top-1.5 flex size-[23px] items-center justify-center rounded-full border border-gold/45 bg-sand-50 sm:size-[27px]"
          >
            <span className="size-1.5 rounded-full bg-wine sm:size-2" />
          </span>
          <UserBubble className="max-w-[88%] px-3 py-2 text-[0.9rem] sm:text-[0.95rem]">
            Preciso decidir se aceito uma proposta que melhora a renda, mas
            afasta minha família durante a semana.
          </UserBubble>
        </div>

        <div className="relative pl-8 sm:pl-9">
          <span
            aria-hidden
            className="absolute left-0 top-1.5 flex size-[23px] items-center justify-center rounded-full border border-gold/45 bg-sand-50 sm:size-[27px]"
          >
            <span className="size-1.5 rounded-full bg-wine sm:size-2" />
          </span>
          <GuideBubble className="max-w-[90%] px-3 py-2.5 text-[0.9rem] sm:text-[0.95rem]">
            O que mais pesa agora: a pressão financeira, o tempo com quem você
            ama, ou o medo de se arrepender depois?
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
            A renda ajuda. Mas tenho medo de perder o ritmo da casa e depois
            culpar a decisão.
          </UserBubble>
        </div>

        <div className="relative pl-8 sm:pl-9">
          <span
            aria-hidden
            className="absolute left-0 top-1.5 flex size-[23px] items-center justify-center rounded-full border border-gold/45 bg-sand-50 sm:size-[27px]"
          >
            <span className="size-1.5 rounded-full bg-wine sm:size-2" />
          </span>
          <GuideBubble className="max-w-[94%] px-3 py-2.5 text-[0.9rem] sm:text-[0.95rem]">
            <p>
              Há tensão entre provisão e presença. Pedir discernimento ajuda —
              sem exigir certeza absoluta. A decisão continua sendo sua.
            </p>
            <p className="mt-2 text-[12px] leading-snug text-ink-soft">
              Não substitui pastor, padre, terapia ou emergência.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <ScriptureChip withIcon>Tiago 1:5</ScriptureChip>
              <ScriptureChip>Provérbios 3:5–6</ScriptureChip>
            </div>
            <NextStepBlock title="Próximo passo possível" className="text-[11.5px]">
              <p>
                Nomeie um critério mínimo que a decisão precisa respeitar.
              </p>
            </NextStepBlock>
          </GuideBubble>
        </div>
      </ContinuityThread>

      <div className="mt-4 space-y-1.5 border-t border-border/50 pt-4">
        <p className="text-sm font-medium text-ink">
          Assim a conversa organiza o que está em jogo.
        </p>
        <p className="text-sm leading-relaxed text-ink-soft">
          Não é mais um vídeo nem um chat genérico — é a sua situação, com
          Escrituras e continuidade. Contexto → pergunta → próximos passos
          possíveis.
        </p>
        <ContinuityMarker className="mt-1">
          Retome no Histórico quando voltar.
        </ContinuityMarker>
      </div>
    </div>
  );
}
