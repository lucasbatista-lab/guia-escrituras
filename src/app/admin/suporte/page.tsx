import Link from "next/link";
import {
  SUPPORT_CAPACITY_NOTE,
  SUPPORT_CATEGORIES,
  SUPPORT_RESPONSE_NOTE,
  SUPPORT_TRIAGE_STEPS,
} from "@/lib/admin";
import { buildSupportMailto } from "@/lib/support/help-center";
import { getSupportEmail } from "@/config/legal";

export const dynamic = "force-dynamic";

export default function AdminSuportePage() {
  const supportEmail = getSupportEmail();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-ink">Suporte</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Canal único: e-mail. {SUPPORT_CAPACITY_NOTE}
        </p>
        <p className="mt-1 text-xs text-ink-soft">{SUPPORT_RESPONSE_NOTE}</p>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-ink">Endereço de suporte</h2>
        {supportEmail ? (
          <p className="text-sm text-ink">
            <a href={`mailto:${supportEmail}`} className="underline underline-offset-2">
              {supportEmail}
            </a>
          </p>
        ) : (
          <p className="text-sm text-ink-soft">
            Canal de suporte em configuração — nenhum e-mail definido.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-ink">Checklist de triagem</h2>
        <ol className="space-y-2 text-sm">
          {SUPPORT_TRIAGE_STEPS.map((item) => (
            <li
              key={item.step}
              className="rounded-lg border border-border/60 px-3 py-3"
            >
              <p className="text-ink">
                {item.step}. {item.title}
              </p>
              <p className="mt-1 text-xs text-ink-soft">{item.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-ink">
          Atalhos por categoria
        </h2>
        <p className="text-sm text-ink-soft">
          Abre um rascunho de e-mail pré-preenchido — nunca solicita conteúdo
          completo de conversas.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {SUPPORT_CATEGORIES.map((cat) => {
            const mailto = buildSupportMailto(cat.id);
            return (
              <li
                key={cat.id}
                className="rounded-lg border border-border/60 px-3 py-3 text-sm"
              >
                <p className="text-ink">{cat.label}</p>
                <p className="mt-1 text-xs text-ink-soft">{cat.description}</p>
                {mailto ? (
                  <a
                    href={mailto}
                    className="mt-2 inline-block text-xs underline underline-offset-2"
                  >
                    Responder por e-mail
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-ink">
          Contexto operacional relacionado
        </h2>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href="/admin/usuarios"
            className="rounded-md border border-border/70 bg-card/50 px-3 py-1.5 text-ink hover:bg-sand-50"
          >
            Buscar assinante
          </Link>
          <Link
            href="/admin/eventos"
            className="rounded-md border border-border/70 bg-card/50 px-3 py-1.5 text-ink hover:bg-sand-50"
          >
            Eventos de pagamento
          </Link>
          <Link
            href="/admin/incidentes"
            className="rounded-md border border-border/70 bg-card/50 px-3 py-1.5 text-ink hover:bg-sand-50"
          >
            Incidentes
          </Link>
          <Link
            href="/ajuda"
            className="rounded-md border border-border/70 bg-card/50 px-3 py-1.5 text-ink hover:bg-sand-50"
          >
            Help Center (público)
          </Link>
        </div>
      </section>
    </div>
  );
}
