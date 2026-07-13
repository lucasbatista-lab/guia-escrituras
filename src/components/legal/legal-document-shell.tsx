import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import {
  getLegalEntityDocument,
  getLegalEntityName,
  getSupportEmail,
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

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
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
          <a href={`mailto:${getSupportEmail()}`} className="text-ink underline-offset-4 hover:underline">
            {getSupportEmail()}
          </a>
          {" · "}
          <Link href="/transparencia-ia" className="text-ink underline-offset-4 hover:underline">
            Transparência sobre IA
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
