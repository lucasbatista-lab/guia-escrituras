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
    title: "1. Escolha seu plano",
    body: "Essencial, Caminho ou Profundo — com benefícios claros do que já está disponível hoje.",
  },
  {
    title: "2. Confirme seu e-mail",
    body: "Crie a conta e confirme o e-mail para seguir com segurança.",
  },
  {
    title: "3. Pague com segurança",
    body: "Checkout pela Stripe. Renovação mensal, cancelável na sua conta no Amém Chat.",
  },
  {
    title: "4. Personalize e converse",
    body: "Escolha a tradição e o tom das reflexões — depois traga sua situação.",
  },
];

const whatYouGet = [
  "Conversas com orientação baseada nas Escrituras",
  "Tradição espiritual no perfil (ecumênica, evangélica ou católica)",
  "Memória da conversa em andamento",
  "Uso flexível dentro do orçamento do plano escolhido",
  "Cancelamento da renovação pela própria conta no Amém Chat",
];

const faq = [
  {
    q: "A plataforma afirma ser Jesus?",
    a: "Não. É uma experiência de inteligência artificial baseada nas Escrituras — nunca apresentada como voz divina. Detalhes em Transparência sobre IA.",
  },
  {
    q: "Como funciona o pagamento?",
    a: "Assinatura mensal com renovação automática. O checkout é processado pela Stripe. Você confirma o e-mail primeiro e só então conclui a assinatura.",
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
          <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-6 sm:px-6 lg:pb-16 lg:pt-10">
            <div className="animate-fade-up max-w-2xl">
              <p className="font-display text-4xl leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-[3.4rem]">
                {brand.name}
              </p>
              <h1 className="mt-5 max-w-xl text-balance font-display text-2xl leading-snug text-ink sm:text-3xl">
                {brand.tagline}
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-soft sm:text-lg">
                Quando a mente aperta e faltam palavras, traga a situação real e
                receba uma reflexão clara, pastoral e ancorada nas Escrituras —
                com a tradição que você escolhe.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="min-h-11 bg-ink hover:bg-ink/90">
                  <TrackingLink href="/planos">Escolher meu plano</TrackingLink>
                </Button>
                <Button asChild size="lg" variant="outline" className="min-h-11">
                  <a href="#demonstracao">Ver uma reflexão de exemplo</a>
                </Button>
              </div>
              <p className="mt-5 max-w-md text-xs leading-relaxed text-ink-soft">
                Assinatura mensal · pagamento seguro pela Stripe · renovação
                cancelável na sua conta.
              </p>
            </div>
          </div>
        </section>

        <section
          className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16"
          aria-labelledby="demo-heading"
        >
          <h2 id="demo-heading" className="font-display text-3xl text-ink">
            Veja uma reflexão de exemplo
          </h2>
          <p className="mt-3 max-w-2xl text-ink-soft">
            Experimente situações reais abaixo — sem criar conta e sem chamar a
            API.
          </p>
          <div className="mt-8 max-w-xl lg:max-w-2xl">
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
          <h2 className="font-display text-3xl text-ink">Como começar</h2>
          <p className="mt-3 max-w-2xl text-ink-soft">
            Do plano à primeira conversa, em passos claros.
          </p>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
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
            Benefícios disponíveis hoje
          </h2>
          <p className="mt-3 max-w-2xl text-ink-soft">
            O que já funciona na assinatura. Recursos em desenvolvimento não
            entram nesta lista.
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
            A tradição que você escolhe molda como as reflexões são
            apresentadas — não apenas o tom.
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
          <h2 className="font-display text-3xl text-ink">Planos</h2>
          <p className="mt-3 max-w-2xl text-ink-soft">
            Assinatura mensal com renovação automática. Escolha o ritmo que cabe
            na sua vida — frequência e profundidade variam por plano. Recursos
            futuros aparecem separados como “Em desenvolvimento”.
          </p>
          <div className="mt-10">
            <PlanCards />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl text-ink">
            Transparência e segurança
          </h2>
          <p className="mt-3 max-w-2xl text-ink-soft">
            O Amém Chat é inteligência artificial baseada nas Escrituras. Não
            afirma ser Jesus, Deus ou revelação. Identidade clara, checkout
            seguro e cancelamento sem labirinto — detalhes completos em{" "}
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
              Pronto para começar?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-ink-soft">
              Escolha o plano, confirme o e-mail e traga sua situação com a
              tradição que faz sentido para você.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-8 min-h-11 bg-wine hover:bg-wine-soft"
            >
              <TrackingLink href="/planos">Escolher meu plano</TrackingLink>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
