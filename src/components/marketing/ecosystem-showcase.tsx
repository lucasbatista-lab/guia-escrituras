import {
  BookMarked,
  BookOpenText,
  Check,
  History,
  Layers3,
  MessageCircleMore,
  SlidersHorizontal,
} from "lucide-react";

const continuityItems = [
  {
    icon: History,
    title: "Histórico privado",
    body: "Retome conversas anteriores sem recomeçar sua história do zero.",
    access: "Todos os planos",
  },
  {
    icon: BookMarked,
    title: "Jornadas",
    body: "Percursos guiados de 7 etapas, com progresso salvo e ritmo flexível.",
    access: "Caminho e Profundo",
  },
  {
    icon: Layers3,
    title: "Aprofundar",
    body: "Uma segunda análise sob demanda, com mais contexto, tensões e passos.",
    access: "Profundo",
  },
] as const;

export function EcosystemShowcase() {
  return (
    <div>
      <div className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-wine">
          Seu espaço no Amém Chat
        </p>
        <h2 className="mt-2 text-balance font-display text-3xl text-ink sm:text-4xl">
          Um lugar para conversar, continuar e aprofundar
        </h2>
        <p className="mt-3 leading-relaxed text-ink-soft">
          A conversa é o começo. O produto organiza referências, próximos passos
          e continuidade em uma experiência feita para acompanhar situações reais.
        </p>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="relative overflow-hidden rounded-3xl bg-ink p-5 text-sand-50 shadow-[0_24px_60px_-35px_rgba(44,36,28,0.7)] sm:p-7">
          <div
            aria-hidden
            className="absolute -right-16 -top-20 size-64 rounded-full bg-wine/40 blur-3xl"
          />
          <div className="relative">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-sand-50/10">
              <MessageCircleMore aria-hidden className="size-5 text-gold-soft" />
            </span>
            <p className="mt-5 text-xs font-medium uppercase tracking-[0.14em] text-sand-200">
              Função principal · todos os planos
            </p>
            <h3 className="mt-2 font-display text-2xl">Conversar com contexto</h3>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-sand-200">
              Traga a situação com suas palavras. A resposta conecta acolhimento,
              referências bíblicas, interpretação identificada e aplicação prática.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {[
                "Tradição cristã escolhida no perfil",
                "Profundidade de resposta ajustável",
                "Próximos passos concretos",
                "Continuidade dentro da conversa",
              ].map((item) => (
                <p
                  key={item}
                  className="flex items-start gap-2 rounded-xl bg-sand-50/[0.07] px-3 py-2.5 text-xs text-sand-100"
                >
                  <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-gold-soft" />
                  {item}
                </p>
              ))}
            </div>
          </div>
        </article>

        <div className="grid gap-4">
          <article className="rounded-3xl border border-gold/20 bg-gradient-to-br from-card to-sand-100/70 p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-wine/[0.08] text-wine">
                <BookOpenText aria-hidden className="size-5" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft">
                  Em cada reflexão
                </p>
                <h3 className="mt-1 font-display text-xl text-ink">
                  Escrituras que entram em diálogo
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  Referências relacionadas ao tema, sem versículos soltos nem
                  promessa de resposta divina.
                </p>
              </div>
            </div>
          </article>
          <article className="rounded-3xl border border-border/70 bg-card/75 p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sand-200/70 text-ink">
                <SlidersHorizontal aria-hidden className="size-5" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft">
                  Personalização real
                </p>
                <h3 className="mt-1 font-display text-xl text-ink">
                  Seu perfil orienta a experiência
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  Escolha tradição ecumênica, evangélica ou católica e ajuste a
                  profundidade das respostas comuns.
                </p>
              </div>
            </div>
          </article>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {continuityItems.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.title}
              className="rounded-2xl border border-border/70 bg-background/75 p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <Icon aria-hidden className="size-5 text-wine" />
                <span className="rounded-full bg-sand-100 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-ink-soft">
                  {item.access}
                </span>
              </div>
              <h3 className="mt-4 font-display text-xl text-ink">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{item.body}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
