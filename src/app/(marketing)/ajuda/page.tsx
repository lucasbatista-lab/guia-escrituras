import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { MAIN_CONTENT_ID } from "@/components/a11y/main-content-id";
import { getSupportEmail } from "@/config/legal";
import { buildPublicPageMetadata } from "@/lib/seo";
import {
  HELP_FAQ,
  SUPPORT_CATEGORIES,
  SUPPORT_RESPONSE_NOTE,
  buildSupportMailto,
} from "@/lib/support/help-center";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Ajuda e suporte",
  description:
    "Central de ajuda do Amém Chat: acesso, cobrança, Jornadas, privacidade e contato operacional.",
  path: "/ajuda",
});

export default function AjudaPage() {
  const supportEmail = getSupportEmail();

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className="mx-auto max-w-3xl px-4 py-12 outline-none sm:px-6"
      >
        <h1 className="font-display text-3xl text-ink sm:text-4xl">
          Ajuda e suporte
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Respostas rápidas sobre acesso, cobrança e uso. O suporte é
          operacional — não é aconselhamento pastoral, clínico ou jurídico, e
          não usamos WhatsApp para reflexões espirituais.
        </p>
        <p className="mt-2 text-sm text-ink-soft">{SUPPORT_RESPONSE_NOTE}</p>

        <section className="mt-10 space-y-4" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="font-display text-2xl text-ink">
            Perguntas frequentes
          </h2>
          <ul className="space-y-4">
            {HELP_FAQ.map((item) => (
              <li
                key={item.q}
                className="rounded-xl border border-border/70 px-4 py-3"
              >
                <h3 className="text-sm font-medium text-ink">{item.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {item.a}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12 space-y-4" aria-labelledby="intake-heading">
          <h2 id="intake-heading" className="font-display text-2xl text-ink">
            Falar com o suporte
          </h2>
          <p className="text-sm text-ink-soft">
            Escolha uma categoria. Abrimos seu e-mail com um assunto pronto —
            descreva só o necessário para operação. Evite colar conversas
            espirituais completas ou dados de cartão.
          </p>
          {!supportEmail ? (
            <p className="text-sm text-amber-900">
              Canal de suporte em configuração. Tente novamente em breve.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {SUPPORT_CATEGORIES.map((cat) => {
                const href = buildSupportMailto(cat.id);
                return (
                  <li key={cat.id}>
                    <a
                      href={href ?? undefined}
                      className="flex min-h-11 flex-col justify-center rounded-xl border border-border/70 px-4 py-3 text-sm text-ink hover:bg-sand-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <span className="font-medium">{cat.label}</span>
                      <span className="mt-1 text-xs text-ink-soft">
                        {cat.description}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
          {supportEmail ? (
            <p className="text-xs text-ink-soft">
              Ou escreva diretamente para{" "}
              <a
                href={`mailto:${supportEmail}`}
                className="underline underline-offset-2"
              >
                {supportEmail}
              </a>
              .
            </p>
          ) : null}
        </section>

        <p className="mt-12 text-sm text-ink-soft">
          <Link href="/planos" className="underline underline-offset-2">
            Ver planos
          </Link>
          {" · "}
          <Link href="/cancelamento" className="underline underline-offset-2">
            Cancelamento
          </Link>
          {" · "}
          <Link href="/privacidade" className="underline underline-offset-2">
            Privacidade
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
