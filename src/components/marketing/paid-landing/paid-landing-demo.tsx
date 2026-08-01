import {
  ContinuityMarker,
  ContinuityMoment,
  ContinuityThread,
  ConversationEyebrow,
  GuideBubble,
  NextStepBlock,
  ScriptureChip,
  UserBubble,
} from "./conversation-language";

/**
 * Simulated product walkthrough — no live AI calls.
 * Structure mirrors a real Amém Chat turn and ends in continuity.
 */
export function PaidLandingDemo() {
  return (
    <div className="mx-auto max-w-2xl">
      <ConversationEyebrow>Exemplo ilustrativo</ConversationEyebrow>
      <h2
        id="demonstracao-heading"
        className="mt-2 font-display text-2xl text-ink sm:text-3xl"
      >
        Como uma conversa contextual se desenrola
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft sm:text-base">
        Um exemplo revisado, fiel ao padrão do produto. Não é uma chamada real à
        IA nem um atendimento pastoral.
      </p>

      <ContinuityThread className="mt-6">
        <ContinuityMoment label="1. Situação">
          <UserBubble>
            Preciso decidir se aceito uma proposta de trabalho que melhora a
            renda, mas afasta minha família durante a semana.
          </UserBubble>
        </ContinuityMoment>

        <ContinuityMoment label="2. Pergunta de aprofundamento">
          <GuideBubble>
            O que mais pesa agora: a pressão financeira, o tempo com as pessoas
            que você ama, ou o medo de se arrepender depois?
          </GuideBubble>
        </ContinuityMoment>

        <ContinuityMoment label="3. Esclarecimento">
          <UserBubble>
            A renda ajuda bastante. Mas tenho medo de perder o ritmo da casa e
            depois culpar a decisão.
          </UserBubble>
        </ContinuityMoment>

        <ContinuityMoment label="4. Organização e reflexão">
          <GuideBubble>
            <p>
              Decidir com sabedoria não exige certeza absoluta. As Escrituras
              convidam a pedir discernimento, a considerar responsabilidades e a
              dar um passo concreto sem fingir que o medo não existe.
            </p>
            <p className="mt-2 font-sans text-[12px] text-ink-soft">
              O Amém Chat não decide por você e não substitui pastor, padre,
              comunidade ou terapia — organiza o que está em jogo para você
              escolher com mais clareza.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <ScriptureChip withIcon>Tiago 1:5</ScriptureChip>
              <ScriptureChip>Provérbios 3:5–6</ScriptureChip>
            </div>
            <NextStepBlock>
              <ul className="list-disc space-y-1 pl-4">
                <li>Liste o que a nova rotina mudaria na prática em 7 dias.</li>
                <li>
                  Converse com alguém de confiança sobre o impacto familiar.
                </li>
                <li>Defina um critério mínimo que a decisão precisa respeitar.</li>
              </ul>
            </NextStepBlock>
          </GuideBubble>
        </ContinuityMoment>

        <ContinuityMoment label="5. Continuidade">
          <div className="space-y-2">
            <ContinuityMarker>
              Você pode retomar esta conversa no Histórico quando voltar.
            </ContinuityMarker>
            <ContinuityMarker>
              Em planos elegíveis, aprofunde o mesmo tema ou siga por uma
              Jornada.
            </ContinuityMarker>
          </div>
        </ContinuityMoment>
      </ContinuityThread>
    </div>
  );
}
