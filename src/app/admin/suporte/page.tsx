import {
  SUPPORT_CAPACITY_NOTE,
  SUPPORT_CATEGORIES,
  SUPPORT_RESPONSE_NOTE,
  SUPPORT_TRIAGE_STEPS,
} from "@/lib/admin";
import { buildSupportMailto } from "@/lib/support/help-center";
import { getSupportEmail } from "@/config/legal";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  AdminOpLink,
  AdminSection,
} from "@/components/admin/admin-primitives";

export const dynamic = "force-dynamic";

export default function AdminSuportePage() {
  const supportEmail = getSupportEmail();

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Operação"
        title="Suporte"
        description="Mesa operacional — canal oficial e atalhos primeiro. Respostas via e-mail; sem fila de tickets integrada ao Admin."
        meta={SUPPORT_RESPONSE_NOTE}
      />

      <AdminSection
        title="Canal oficial"
        description="Endereço de suporte e atalhos para triagem rápida."
        tone="priority"
      >
        {supportEmail ? (
          <p className="text-sm text-ink">
            <a
              href={`mailto:${supportEmail}`}
              className="font-medium underline underline-offset-2"
            >
              {supportEmail}
            </a>
          </p>
        ) : (
          <p className="text-sm text-ink-soft">
            Canal de suporte em configuração — nenhum e-mail definido.
          </p>
        )}

        <div className="flex flex-wrap gap-2 text-sm">
          <AdminOpLink href="/admin/usuarios">Buscar assinante</AdminOpLink>
          <AdminOpLink href="/admin/eventos">Eventos de pagamento</AdminOpLink>
          <AdminOpLink href="/admin/incidentes">Incidentes</AdminOpLink>
          <AdminOpLink href="/ajuda">Help Center (público)</AdminOpLink>
        </div>
      </AdminSection>

      <AdminSection
        title="Atalhos por categoria"
        description="Abre um rascunho de e-mail pré-preenchido — nunca solicita conteúdo completo de conversas."
      >
        <ul className="grid gap-2 sm:grid-cols-2">
          {SUPPORT_CATEGORIES.map((cat) => {
            const mailto = buildSupportMailto(cat.id);
            return (
              <li
                key={cat.id}
                className="rounded-lg border border-border/60 px-3 py-3 text-sm"
              >
                <p className="font-medium text-ink">{cat.label}</p>
                <p className="mt-1 text-xs text-ink-soft">{cat.description}</p>
                {mailto ? (
                  <a
                    href={mailto}
                    className="mt-2 inline-flex min-h-11 items-center text-xs font-medium underline underline-offset-2"
                  >
                    Responder por e-mail
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      </AdminSection>

      <AdminSection
        title="Checklist de triagem"
        description="Ordem sugerida antes de escalar."
      >
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
      </AdminSection>

      <AdminSection title="Capacidade" tone="muted">
        <p className="text-sm text-ink-soft">{SUPPORT_CAPACITY_NOTE}</p>
      </AdminSection>
    </div>
  );
}
