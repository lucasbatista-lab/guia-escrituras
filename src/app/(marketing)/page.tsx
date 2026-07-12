import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { ChatDemo } from "@/components/marketing/chat-demo";
import { PlanCards } from "@/components/marketing/plan-cards";
import { TRADITION_POLICIES } from "@/lib/theology";
import { Button } from "@/components/ui/button";

const benefits = [
  {
    title: "Orientação com as Escrituras",
    body: "Respostas que distinguem citação, interpretação e aplicação prática.",
  },
  {
    title: "Tradição que você escolhe",
    body: "Ecumênica, evangélica ou católica — com políticas teológicas explícitas.",
  },
  {
    title: "Acolhimento sem manipulação",
    body: "Tom pastoral e claro, sem pressionar compra, doação ou culpa.",
  },
  {
    title: "Transparência de identidade",
    body: "É inteligência artificial. Não afirma ser Jesus, Deus ou revelação.",
  },
];

const faq = [
  {
    q: "A plataforma afirma ser Jesus?",
    a: "Não. É uma experiência de IA que produz reflexões baseadas nas Escrituras e na tradição que você seleciona.",
  },
  {
    q: "Posso escolher minha tradição?",
    a: "Sim. O perfil espiritual guarda tradição, estilo de resposta e preferências — e isso molda a política teológica da conversa.",
  },
  {
    q: "As citações bíblicas são de traduções oficiais?",
    a: "Nesta fundação usamos referências e demonstrações rotuladas. A integração com fonte licenciada virá em seguida.",
  },
  {
    q: "Substitui aconselhamento profissional?",
    a: "Não. Em temas de saúde, direito ou saúde mental, a orientação é buscar profissionais adequados.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14 lg:pt-10">
          <div className="animate-fade-up">
            <p className="font-display text-4xl leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-[3.4rem]">
              Guia Escrituras
            </p>
            <h1 className="mt-5 max-w-xl text-balance font-display text-2xl leading-snug text-ink-soft sm:text-3xl">
              Como Jesus responderia à sua situação?
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-soft sm:text-lg">
              Reflexões e orientações baseadas nas Escrituras, com a tradição
              que você escolher — apresentadas com clareza como inteligência
              artificial, nunca como voz divina.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-ink hover:bg-ink/90">
                <Link href="/cadastro">Começar agora</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/como-funciona">Ver como funciona</Link>
              </Button>
            </div>
          </div>
          <ChatDemo />
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl text-ink">Por que existe</h2>
          <p className="mt-3 max-w-2xl text-ink-soft">
            Um espaço sereno para trazer sua situação e receber orientação
            ancorada nas Escrituras — com respeito às diferenças de tradição.
          </p>
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            {benefits.map((item) => (
              <div key={item.title}>
                <h3 className="font-display text-xl text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl text-ink">Planos</h2>
          <p className="mt-3 max-w-2xl text-ink-soft">
            Benefícios definidos por entitlements configuráveis — sem cotas
            rígidas de mensagens na vitrine.
          </p>
          <div className="mt-10">
            <PlanCards />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl text-ink">Tradições</h2>
          <p className="mt-3 max-w-2xl text-ink-soft">
            A tradição altera a política teológica da resposta — não apenas o
            tom cosmético.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {TRADITION_POLICIES.map((tradition) => (
              <div
                key={tradition.key}
                className="rounded-2xl border border-border/70 bg-card/50 p-5"
              >
                <h3 className="font-display text-xl text-ink">
                  {tradition.label}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {tradition.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl text-ink">Perguntas frequentes</h2>
          <div className="mt-8 space-y-6">
            {faq.map((item) => (
              <div key={item.q} className="border-b border-border/60 pb-6">
                <h3 className="font-medium text-ink">{item.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
          <div className="rounded-3xl border border-border/70 bg-gradient-to-br from-sand-100/90 to-card px-6 py-12 text-center sm:px-10">
            <h2 className="font-display text-3xl text-ink sm:text-4xl">
              Traga sua situação com tranquilidade
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-ink-soft">
              Crie sua conta, escolha sua tradição e comece uma conversa
              guiada pelas Escrituras.
            </p>
            <Button asChild size="lg" className="mt-8 bg-wine hover:bg-wine-soft">
              <Link href="/cadastro">Criar conta</Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
