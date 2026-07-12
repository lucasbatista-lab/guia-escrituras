import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Como funciona",
};

const steps = [
  {
    title: "Crie seu perfil espiritual",
    body: "Escolha tradição, estilo de resposta e profundidade preferida.",
  },
  {
    title: "Traga sua situação",
    body: "Escreva com calma. A mensagem é validada e limitada em tamanho por segurança.",
  },
  {
    title: "Política teológica composta",
    body: "Regras gerais + tradição + persona + preferências moldam a resposta.",
  },
  {
    title: "Reflexão com referências",
    body: "Você recebe orientação com referências bíblicas, aviso de interpretação e, quando fizer sentido, uma pergunta de continuidade.",
  },
];

export default function ComoFuncionaPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-4xl text-ink">Como funciona</h1>
        <p className="mt-4 text-ink-soft leading-relaxed">
          Guia Escrituras é uma plataforma de orientação e reflexão baseada
          nas Escrituras. A pergunta central — “Como Jesus responderia à sua
          situação?” — é respondida como interpretação ancorada nos
          Evangelhos, nunca como pretensa voz divina.
        </p>
        <ol className="mt-12 space-y-8">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sand-200 text-sm font-medium text-ink">
                {index + 1}
              </span>
              <div>
                <h2 className="font-display text-xl text-ink">{step.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <Button asChild className="mt-12 bg-ink hover:bg-ink/90">
          <Link href="/cadastro">Criar conta</Link>
        </Button>
      </main>
      <SiteFooter />
    </div>
  );
}
