import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { MAIN_CONTENT_ID } from "@/components/a11y/main-content-id";
import {
  getLegalEntityDocument,
  getLegalEntityName,
  getSupportEmail,
  SUPPORT_CHANNEL_PENDING,
} from "@/config/legal";

export function LegalDocumentShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const entity = getLegalEntityName();
  const document = getLegalEntityDocument();
  const supportEmail = getSupportEmail();

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className="mx-auto max-w-3xl px-4 py-12 outline-none sm:px-6"
      >
        <h1 className="font-display text-3xl text-ink">{title}</h1>
        {(entity || document) && (
          <p className="mt-3 text-sm text-ink-soft">
            {entity && <span>{entity}</span>}
            {entity && document && " · "}
            {document && <span>{document}</span>}
          </p>
        )}
        <article className="prose-legal mt-8 space-y-4 text-sm leading-relaxed text-ink-soft">
          {children}
        </article>
        <p className="mt-10 text-sm text-ink-soft">
          Dúvidas:{" "}
          {supportEmail ? (
            <a
              href={`mailto:${supportEmail}`}
              className="inline-flex min-h-11 items-center text-ink underline-offset-4 hover:underline"
            >
              {supportEmail}
            </a>
          ) : (
            <span>{SUPPORT_CHANNEL_PENDING}</span>
          )}
          {" · "}
          <Link
            href="/transparencia-ia"
            className="inline-flex min-h-11 items-center text-ink underline-offset-4 hover:underline"
          >
            Transparência sobre IA
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
