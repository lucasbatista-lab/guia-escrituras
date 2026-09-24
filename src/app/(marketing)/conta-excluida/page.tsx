import Link from "next/link";
import type { Metadata } from "next";
import { FocusPageTitle } from "@/components/a11y/focus-page-title";
import { Button } from "@/components/ui/button";
import { buildPublicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...buildPublicPageMetadata({
    title: "Conta excluída",
    description: "Sua conta no Amém Chat foi excluída.",
    path: "/conta-excluida",
  }),
  robots: { index: false, follow: false },
};

export default function ContaExcluidaPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <FocusPageTitle className="font-display text-3xl text-ink">
        Conta excluída
      </FocusPageTitle>
      <p className="mt-3 text-sm text-ink-soft" role="status" aria-live="polite">
        Sua conta e os dados associados foram removidos. Se você tinha uma
        assinatura na web, a renovação automática foi cancelada — não haverá
        novas cobranças. Obrigado por ter estado conosco.
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <Button asChild className="min-h-11 bg-ink hover:bg-ink/90">
          <Link href="/">Ir para o início</Link>
        </Button>
        <Button asChild variant="outline" className="min-h-11">
          <Link href="/cadastro">Criar nova conta</Link>
        </Button>
      </div>
    </main>
  );
}
