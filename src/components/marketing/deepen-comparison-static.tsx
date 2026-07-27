import { cn } from "@/lib/utils";

const EXAMPLE_QUESTION =
  "Estou em conflito no trabalho e não sei se devo conversar agora ou esperar.";

const NORMAL_POINTS = [
  {
    label: "Acolhimento",
    body: "O conflito no trabalho cansa — e hesitar entre falar e esperar não é falta de fé; é discernimento pedindo espaço.",
  },
  {
    label: "Direção inicial",
    body: "Busque clareza sobre o que precisa ser dito, o risco real e o timing — sem pressa ansiosa nem silêncio que vira mágoa.",
  },
  {
    label: "Referências",
    body: "Provérbios 15:1 · Tiago 1:19",
  },
  {
    label: "Próximo passo",
    body: "Anote em uma frase o ponto central do conflito e o que você gostaria que a outra pessoa entendesse.",
  },
] as const;

const DEEPEN_ADDS = [
  {
    label: "Contexto",
    body: "Mapeia o que está em jogo: verdade, paz, hierarquia, reputação e o custo de falar agora versus adiar.",
  },
  {
    label: "Tensões e perspectivas",
    body: "Segura a tensão entre coragem e prudência — sem transformar “esperar” em fuga nem “conversar” em impulsividade.",
  },
  {
    label: "Análise de cenários",
    body: "Se X (há abertura e segurança) → converse com um limite claro. Se Y (há risco ou cansaço extremo) → prepare e escolha outro momento.",
  },
  {
    label: "Conexões bíblicas contextualizadas",
    body: "As Escrituras entram em diálogo com a situação — não como lista solta de versículos, mas como luz para o dilema concreto.",
  },
  {
    label: "Próximos passos mais detalhados",
    body: "Roteiro da semana: orar com honestidade, pedir conselho a alguém de confiança e definir um próximo gesto observável.",
  },
] as const;

/**
 * Static Normal vs Aprofundar comparison for marketing landings.
 * Reviewed pastoral example — not a live AI response.
 */
export function DeepenComparisonStatic({
  className,
  headingId = "deepen-comparison-heading",
}: {
  className?: string;
  headingId?: string;
}) {
  return (
    <section
      className={cn("scroll-mt-24", className)}
      aria-labelledby={headingId}
    >
      <div className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-soft">
          Exemplo revisado de como o recurso funciona
        </p>
        <h2
          id={headingId}
          className="mt-2 font-display text-3xl text-ink sm:text-4xl"
        >
          Normal versus Aprofundar
        </h2>
        <p className="mt-3 text-ink-soft">
          Aprofundar não é “mais espiritualidade”. É uma segunda passagem sob
          demanda — mais contexto, tensões e passos — disponível no plano
          Profundo.
        </p>
      </div>

      <figure className="mt-8 rounded-2xl border border-border/70 bg-card/60 px-5 py-4 sm:px-6">
        <figcaption className="text-xs font-medium uppercase tracking-[0.1em] text-ink-soft">
          Pergunta de exemplo
        </figcaption>
        <blockquote className="mt-2 font-display text-lg leading-snug text-ink">
          “{EXAMPLE_QUESTION}”
        </blockquote>
      </figure>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <article className="flex flex-col rounded-2xl border border-border/70 bg-background/80 p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft">
            Resposta normal
          </p>
          <h3 className="mt-2 font-display text-xl text-ink">
            Acolhimento com direção
          </h3>
          <p className="mt-2 text-sm text-ink-soft">
            Presente em todos os planos com chat.
          </p>
          <ul className="mt-5 flex-1 space-y-4">
            {NORMAL_POINTS.map((item) => (
              <li key={item.label}>
                <p className="text-sm font-medium text-ink">{item.label}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        </article>

        <article className="flex flex-col rounded-2xl border border-wine/25 bg-wine/[0.04] p-5 shadow-sm ring-1 ring-wine/10">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-wine">
            Com Aprofundar
          </p>
          <h3 className="mt-2 font-display text-xl text-ink">
            Segunda análise sob demanda
          </h3>
          <p className="mt-2 text-sm text-ink-soft">
            Mantém o acolhimento e acrescenta camadas — não apenas um texto
            maior.
          </p>
          <ul className="mt-5 flex-1 space-y-4">
            {DEEPEN_ADDS.map((item) => (
              <li key={item.label}>
                <p className="text-sm font-medium text-ink">{item.label}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <p className="mt-5 max-w-2xl text-xs leading-relaxed text-ink-soft">
        Texto revisado para demonstração. Não é uma resposta gerada neste
        momento e não é revelação divina. Aprofundar usa mais espaço do plano e
        pode ser cancelado junto com a renovação na sua conta.
      </p>
    </section>
  );
}
