import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Mensagens personalizadas",
};

export default function MensagensPersonalizadasPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-4xl text-ink">
          Mensagens personalizadas
        </h1>
        <p className="mt-4 leading-relaxed text-ink-soft">
          No plano Particular, é possível solicitar conteúdo sob medida e
          acompanhamento com concierge humano. Nesta fundação, o checkout
          real ainda não está ativo — use “Solicitar acesso” para registrar
          interesse.
        </p>
        <div className="mt-10 rounded-2xl border border-border/70 bg-card/60 p-6">
          <h2 className="font-display text-2xl text-ink">Plano Particular</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Acesso sob solicitação · R$ 988/mês quando habilitado
          </p>
          <Button asChild className="mt-6 bg-wine hover:bg-wine-soft">
            <Link href="/cadastro">Solicitar acesso</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
