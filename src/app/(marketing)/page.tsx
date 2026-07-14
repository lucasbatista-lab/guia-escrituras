import { brand } from "@/config/brand";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { ChatDemo } from "@/components/marketing/chat-demo";
import { PlanCards } from "@/components/marketing/plan-cards";
import { TrackingLink } from "@/components/marketing/tracking-link";
import { TRADITION_POLICIES } from "@/lib/theology";
import { Button } from "@/components/ui/button";

const situations = [
  {
    title: "Quando a ansiedade aperta",
    body: "Traga o que está pesando e receba uma reflexão que combina Escrituras, clareza e um próximo passo possível.",
  },
  {
    title: "Quando a decisão é difícil",
    body: "Organize o dilema com luz bíblica — sem atalhos mágicos e sem pressão para comprar nada.",
  },
  {
    title: "Quando a relação magoa",
    body: "Família, perdão e reconciliação com tom pastoral, honesto e cuidadoso.",
  },
  {
    title: "Quando é hora de recomeçar",
    body: "Um espaço sereno para nombrar falhas, pedir força e dar o primeiro passo com esperança prática.",
  },
];

const steps = [
  {
    title: "1. Crie sua conta",
    body: "Confirme o e-mail e escolha a tradição que moldará as respostas.",
  },
  {
    title: "2. Assine com segurança",
    body: "Checkout pela Stripe. Você só paga depois da confirmação do e-mail.",
  },
  {
    title: "3. Traga sua situação",
    body: "Converse com orientação baseada nas Escrituras — referência, interpretação e aplicação.",
  },
];

const whatYouGet = [
  "Conversas com orientação baseada nas Escrituras",
  "Tradição espiritual no perfil (ecumênica, evangélica ou católica)",
  "Memória da conversa em andamento",
  "Cancelamento da renovação pela própria conta no Amém Chat",
];

const faq = [
  {
    q: "A plataforma afirma ser Jesus?",
    a: "Não. É uma experiência de inteligência artificial baseada nas Escrituras — nunca apresentada como voz divina.",
  },
  {
    q: "Como funciona o pagamento?",
    a: "O checkout é processado pela Stripe. Você confirma o e-mail primeiro e só então conclui a assinatura.",
  },
  {
    q: "Posso cancelar facilmente?",
    a: "Sim. A renovação automática pode ser cancelada pela sua conta no Amém Chat, com acesso até o fim do período já pago.",
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
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(198,160,90,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(74,28,42,0.08),_transparent_50%)]"
          />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14 lg:pt-10">
            <div className="animate-fade-up">
              <p className="font-display text-4xl leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-[3.4rem]">
                {brand.name}
              </p>
              <h1 className="mt-5 max-w-xl text-balance font-display text-2xl leading-snug text-ink sm:text-3xl">
                {brand.tagline}
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-soft sm:text-lg">
                Quando a mente aperta e faltam palavras, o Amém Chat ajuda você
                a trazer a situação real e receber uma reflexão clara, pastoral
                e ancorada nas Escrituras — com a tradição que você escolhe.
              </p>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-soft">
                É inteligência artificial. Não afirma ser Jesus, Deus ou
                revelação.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-ink hover:bg-ink/90">
                  <TrackingLink href="/cadastro">Criar minha conta</TrackingLink>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href="#demonstracao">Ver um exemplo</a>
                </Button>
              </div>
              <p className="mt-5 max-w-md text-xs leading-relaxed text-ink-soft">
                Pagamento seguro pela Stripe · renovação cancelável na sua conta
                · acesso após confirmar o e-mail e concluir a assinatura.
              </p>
            </div>
            <ChatDemo />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl text-ink">
            Situações em que o Amém Chat pode ajudar
          </h2>
          <p className="mt-3 max-w-2xl text-ink-soft">
            Não promete soluções mágicas. Oferece clareza, companhia espiritual
            e um próximo passo possível.
          </p>
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            {situations.map((item) => (
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
          <h2 className="font-display text-3xl text-ink">Como funciona</h2>
          <p className="mt-3 max-w-2xl text-ink-soft">
            Três passos simples até a primeira conversa.
          </p>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.title}>
                <h3 className="font-display text-xl text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl text-ink">
            O que você recebe hoje
          </h2>
          <p className="mt-3 max-w-2xl text-ink-soft">
            Benefícios já disponíveis. Recursos em desenvolvimento não entram
            nesta lista.
          </p>
          <ul className="mt-8 max-w-xl space-y-3 text-sm text-ink-soft">
            {whatYouGet.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-wine/70" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl text-ink">Tradições</h2>
          <p className="mt-3 max-w-2xl text-ink-soft">
            A tradição altera a política teológica da resposta — não apenas o
            tom.
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
          <h2 className="font-display text-3xl text-ink">
            Transparência e segurança
          </h2>
          <p className="mt-3 max-w-2xl text-ink-soft">
            Identidade clara, checkout seguro e cancelamento sem labirinto.
            Detalhes completos em{" "}
            <TrackingLink
              href="/transparencia-ia"
              className="text-ink underline underline-offset-4"
            >
              Transparência sobre IA
            </TrackingLink>
            .
          </p>
          <ul className="mt-8 grid gap-4 text-sm text-ink-soft sm:grid-cols-2">
            <li>Pagamento processado pela Stripe</li>
            <li>Renovação cancelável na sua conta</li>
            <li>Sem pressão de doação ou culpa na conversa</li>
            <li>Referências bíblicas apresentadas por síntese</li>
          </ul>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl text-ink">Planos</h2>
          <p className="mt-3 max-w-2xl text-ink-soft">
            Escolha o ritmo que cabe na sua vida. Recursos futuros aparecem
            separados como “Em desenvolvimento”.
          </p>
          <div className="mt-10">
            <PlanCards />
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
              Pronto para trazer sua situação?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-ink-soft">
              Crie a conta, confirme o e-mail e comece com a tradição que faz
              sentido para você.
            </p>
            <Button asChild size="lg" className="mt-8 bg-wine hover:bg-wine-soft">
              <TrackingLink href="/cadastro">Criar conta</TrackingLink>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
