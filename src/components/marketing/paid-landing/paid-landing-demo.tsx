/**
 * Simulated product walkthrough — no live AI calls.
 * Structure mirrors a real Amém Chat turn: relato → aprofundamento →
 * esclarecimento → reflexão → referências → próximos passos.
 */
export function PaidLandingDemo() {
  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-soft">
        Exemplo ilustrativo
      </p>
      <h2
        id="demonstracao-heading"
        className="mt-2 font-display text-2xl text-ink sm:text-3xl"
      >
        Como uma conversa contextual se desenrola
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft sm:text-base">
        Este é um exemplo revisado, fiel ao padrão do produto. Não é uma chamada
        real à IA nem um atendimento pastoral.
      </p>

      <ol className="mt-6 space-y-4 font-chat text-[0.95rem] leading-relaxed text-ink">
        <li className="rounded-2xl border border-border/70 bg-card/70 p-4">
          <p className="font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-ink-soft">
            1. Relato inicial
          </p>
          <p className="mt-2 ml-auto max-w-[92%] rounded-2xl rounded-br-sm bg-ink px-3.5 py-2.5 text-sand-50">
            Preciso decidir se aceito uma proposta de trabalho que melhora a
            renda, mas afasta minha família durante a semana.
          </p>
        </li>

        <li className="rounded-2xl border border-border/70 bg-card/70 p-4">
          <p className="font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-ink-soft">
            2. Pergunta de aprofundamento
          </p>
          <p className="mt-2 max-w-[94%] rounded-2xl rounded-bl-sm border border-border/70 bg-white/80 px-3.5 py-3 shadow-sm">
            O que mais pesa agora: a pressão financeira, o tempo com as pessoas
            que você ama, ou o medo de se arrepender depois?
          </p>
        </li>

        <li className="rounded-2xl border border-border/70 bg-card/70 p-4">
          <p className="font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-ink-soft">
            3. Esclarecimento
          </p>
          <p className="mt-2 ml-auto max-w-[92%] rounded-2xl rounded-br-sm bg-ink px-3.5 py-2.5 text-sand-50">
            A renda ajuda bastante. Mas tenho medo de perder o ritmo da casa e
            depois culpar a decisão.
          </p>
        </li>

        <li className="rounded-2xl border border-border/70 bg-card/70 p-4">
          <p className="font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-ink-soft">
            4. Trecho de reflexão
          </p>
          <div className="mt-2 max-w-[94%] rounded-2xl rounded-bl-sm border border-border/70 bg-white/80 px-3.5 py-3 shadow-sm">
            <p>
              Decidir com sabedoria não exige certeza absoluta. As Escrituras
              convidam a pedir discernimento, a considerar responsabilidades e a
              dar um passo concreto sem fingir que o medo não existe.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5 font-sans text-[11px] text-ink-soft">
              <span className="rounded-full bg-sand-100 px-2 py-1">Tiago 1:5</span>
              <span className="rounded-full bg-sand-100 px-2 py-1">
                Provérbios 3:5–6
              </span>
            </div>
            <div className="mt-3 border-t border-border/60 pt-2.5 font-sans text-[12px] text-ink-soft">
              <p className="font-medium text-ink">Próximos passos possíveis</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4">
                <li>Liste o que a nova rotina mudaria na prática em 7 dias.</li>
                <li>Converse com alguém de confiança sobre o impacto familiar.</li>
                <li>Defina um critério mínimo que a decisão precisa respeitar.</li>
              </ul>
            </div>
          </div>
        </li>
      </ol>
    </div>
  );
}
