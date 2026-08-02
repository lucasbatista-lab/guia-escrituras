import { brand } from "@/config/brand";
import { getLegalEntityName, getSupportEmail } from "@/config/legal";
import { TrackingLink } from "@/components/marketing/tracking-link";
import { Button } from "@/components/ui/button";

const FAQ = [
  {
    q: "O Amém Chat decide por mim?",
    a: "Não. Ele organiza a situação, ilumina com as Escrituras e sugere próximos passos possíveis. A decisão continua sendo sua.",
  },
  {
    q: "O Amém Chat é apenas um ChatGPT cristão?",
    a: "Não. É uma experiência cristã estruturada: contexto da sua situação, perguntas, referências bíblicas, limites honestos, Histórico, Jornadas e Aprofundar conforme o plano — com privacidade.",
  },
  {
    q: "Substitui pastor, padre, terapia ou emergência?",
    a: "Não. É uma ferramenta de reflexão cristã com IA — não substitui pastor, padre, terapia ou atendimento de emergência.",
  },
  {
    q: "Posso cancelar?",
    a: "Sim. Cancele a renovação na sua Conta e mantenha o acesso até o fim do período já pago.",
  },
] as const;

/**
 * Compact trust close: FAQ + institutional brand line + final CTA.
 * No invented social proof, founder, or long disclaimer wall.
 */
export function PaidLandingV2Close() {
  const supportEmail = getSupportEmail();
  const legalEntity = getLegalEntityName();

  return (
    <>
      <section
        id="faq-v2"
        className="border-t border-border/50 bg-sand-50"
        aria-labelledby="faq-v2-heading"
      >
        <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-9">
          <h2
            id="faq-v2-heading"
            className="font-sans text-lg font-semibold text-ink sm:text-xl"
          >
            Perguntas frequentes
          </h2>
          <div className="mt-4 max-w-2xl space-y-1">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group border-b border-border/50 px-0.5 py-1.5"
              >
                <summary className="cursor-pointer list-none font-medium text-ink outline-none marker:content-none focus-visible:ring-1 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                  <span className="flex min-h-11 items-center justify-between gap-3 text-[0.95rem]">
                    {item.q}
                    <span
                      aria-hidden
                      className="text-ink-soft transition group-open:rotate-45"
                    >
                      +
                    </span>
                  </span>
                </summary>
                <p className="pb-2 text-sm leading-relaxed text-ink-soft">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
          <p className="mt-3 text-sm text-ink-soft">
            <TrackingLink
              href="/ajuda"
              className="underline underline-offset-4 hover:text-ink"
            >
              Ver todas as dúvidas
            </TrackingLink>
          </p>
        </div>
      </section>

      <section
        id="marca-v2"
        className="border-t border-border/40 bg-sand-100/60"
        aria-label="Sobre o Amém Chat"
      >
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
          <p className="font-display text-xl text-ink">{brand.name}</p>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-soft">
            {brand.description}
          </p>
          {legalEntity ? (
            <p className="mt-2 text-xs text-ink-soft">{legalEntity}</p>
          ) : null}
        </div>
      </section>

      <section
        id="comece-v2-final-cta"
        className="relative overflow-hidden bg-ink px-4 py-7 text-sand-50 sm:px-6 sm:py-10"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(198,160,90,0.22),transparent_48%),radial-gradient(ellipse_at_90%_100%,rgba(107,46,58,0.42),transparent_50%)]"
        />
        <div className="relative mx-auto max-w-3xl text-left sm:text-center">
          <h2 className="font-display text-[1.55rem] leading-[1.1] tracking-tight text-sand-50 sm:text-[2.05rem] sm:leading-[1.08]">
            Separe o que está em jogo.
            <br />
            Enxergue um próximo passo possível.
          </h2>
          <div className="mt-4 sm:flex sm:justify-center">
            <Button
              asChild
              size="lg"
              className="min-h-12 bg-sand-50 px-6 text-ink shadow-[0_14px_32px_-18px_rgba(251,248,243,0.55)] hover:bg-sand-100"
            >
              <a href="#planos-v2">Escolher meu plano</a>
            </Button>
          </div>
          <p className="mt-2.5 text-xs text-sand-50/65">
            A partir de R$38/mês · cancele a renovação pela Conta
          </p>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-5 text-sm text-ink-soft sm:px-6">
        <TrackingLink
          href="/privacidade"
          className="inline-flex min-h-11 items-center hover:text-ink"
        >
          Privacidade
        </TrackingLink>
        <TrackingLink
          href="/cookies"
          className="inline-flex min-h-11 items-center hover:text-ink"
        >
          Cookies
        </TrackingLink>
        <TrackingLink
          href="/termos"
          className="inline-flex min-h-11 items-center hover:text-ink"
        >
          Termos
        </TrackingLink>
        <TrackingLink
          href="/ajuda"
          className="inline-flex min-h-11 items-center hover:text-ink"
        >
          Ajuda
        </TrackingLink>
        <TrackingLink
          href="/entrar"
          className="inline-flex min-h-11 items-center hover:text-ink"
        >
          Entrar
        </TrackingLink>
        {supportEmail ? (
          <a
            href={`mailto:${supportEmail}`}
            className="inline-flex min-h-11 items-center text-xs text-ink-soft/80 hover:text-ink"
          >
            {supportEmail}
          </a>
        ) : null}
      </footer>
    </>
  );
}
