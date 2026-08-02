/**
 * Short recognition beat — one user line, one product question.
 * Flows continuously into the clarity board (single “Exemplo ilustrativo”).
 */
export function PaidLandingV2Recognition({
  sectionId = "reconhecimento-v2",
}: {
  sectionId?: string;
}) {
  const headingId = `${sectionId}-heading`;
  return (
    <section
      id={sectionId}
      className="relative bg-sand-100/70"
      aria-labelledby={headingId}
    >
      <div className="mx-auto max-w-6xl px-4 pb-4 pt-6 sm:px-6 sm:pb-5 sm:pt-9 lg:pt-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft">
          Exemplo ilustrativo
        </p>
        <h2
          id={headingId}
          className="mt-1.5 max-w-lg font-sans text-[1.25rem] font-semibold leading-snug tracking-tight text-ink sm:text-[1.45rem]"
        >
          A situação chega misturada.
          <br />
          A pergunta começa a separar.
        </h2>

        <div className="mt-3.5 grid gap-3 sm:mt-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start lg:gap-8">
          <p className="max-w-xl font-chat text-[1.05rem] leading-[1.35] text-ink sm:text-[1.15rem]">
            “Quero perdoar, mas não sei se isso significa voltar a conviver.”
          </p>

          <div className="rounded-2xl border border-ink/10 bg-sand-50 px-3.5 py-3 sm:px-4 sm:py-3.5">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-wine">
              Amém Chat
            </p>
            <p className="mt-1 font-chat text-[0.98rem] leading-snug text-ink sm:text-[1.05rem]">
              O que você quer deixar para trás — e o que ainda precisa proteger?
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
