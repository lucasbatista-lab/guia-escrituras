/**
 * Short recognition beat — one user line, one product question.
 * No timeline, no Situação/Pergunta/Resposta labels, no long thread.
 */
export function PaidLandingV2Recognition() {
  return (
    <section
      id="reconhecimento-v2"
      className="relative border-b border-ink/10 bg-sand-100/70"
      aria-labelledby="reconhecimento-v2-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10 lg:py-12">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft">
          Um momento da conversa
        </p>
        <h2
          id="reconhecimento-v2-heading"
          className="mt-1.5 max-w-xl font-sans text-[1.4rem] font-semibold leading-snug tracking-tight text-ink sm:text-[1.6rem]"
        >
          A situação chega misturada. A pergunta começa a separar.
        </h2>

        <div className="mt-4 grid gap-4 lg:mt-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-end lg:gap-10">
          <blockquote className="relative max-w-xl border-l-[3px] border-wine/70 pl-4 sm:pl-5">
            <p className="font-chat text-[1.08rem] leading-[1.35] text-ink sm:text-[1.22rem]">
              “Quero perdoar alguém da minha família, mas não sei se perdoar
              significa voltar a conviver.”
            </p>
          </blockquote>

          <div className="relative lg:-mb-1">
            <div
              aria-hidden
              className="absolute -inset-2.5 rounded-3xl bg-wine/[0.05] sm:-inset-4"
            />
            <div className="relative rounded-2xl border border-ink/12 bg-sand-50 px-3.5 py-3.5 shadow-[0_18px_40px_-30px_rgba(44,36,28,0.55)] sm:px-5 sm:py-5">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-wine">
                Amém Chat
              </p>
              <p className="mt-1.5 font-chat text-[1.02rem] leading-snug text-ink sm:text-[1.12rem]">
                O que você deseja deixar para trás — e o que ainda precisa ser
                protegido antes de pensar em uma aproximação?
              </p>
            </div>
          </div>
        </div>

        <p className="mt-3.5 text-xs text-ink-soft sm:mt-5 sm:text-sm">
          Exemplo ilustrativo
        </p>
      </div>
    </section>
  );
}
