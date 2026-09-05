import { AcquisitionChatDemo } from "@/components/marketing/chat-demo";

/**
 * Interactive editorial demo for the paid landing — replaces the static
 * before/after clarity board with the same home ChatDemo patterns.
 */
export function PaidLandingV2Clarity({
  sectionId = "clareza-v2",
  plansHref = "/planos",
}: {
  sectionId?: string;
  plansHref?: string;
}) {
  const headingId = `${sectionId}-heading`;

  return (
    <section
      id={sectionId}
      className="relative scroll-mt-6 overflow-hidden bg-sand-50 sm:scroll-mt-8"
      aria-labelledby={headingId}
    >
      <div className="relative mx-auto max-w-6xl px-4 pb-7 pt-2 sm:px-6 sm:pb-10 sm:pt-3 lg:pb-12">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-wine">
          Demonstração
        </p>
        <h2
          id={headingId}
          className="mt-1.5 max-w-2xl font-sans text-[1.35rem] font-semibold leading-snug tracking-tight text-ink sm:text-[1.7rem] lg:text-[1.95rem]"
        >
          Veja como uma situação pode ganhar clareza.
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft sm:text-base">
          Escolha um exemplo ilustrativo. Não é conversa ao vivo nem geração de
          IA nesta página — é o formato da reflexão que o produto oferece.
        </p>

        <div className="mt-5 max-w-2xl sm:mt-6">
          <AcquisitionChatDemo plansHref={plansHref} />
        </div>
      </div>
    </section>
  );
}
