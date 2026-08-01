import { BookOpen, Sparkles } from "lucide-react";
import { ConversationEyebrow } from "./conversation-language";
import { cn } from "@/lib/utils";

/**
 * Static product-surface previews for the paid landing.
 * Illustrative only — no real conversation data or live AI.
 */
function PreviewChrome({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "flex h-full min-h-[15.5rem] flex-col overflow-hidden rounded-[1.35rem] border border-ink/12 bg-sand-50 shadow-[0_18px_40px_-30px_rgba(44,36,28,0.55)]",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border/70 bg-card/80 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-wine text-sand-50">
            <Sparkles aria-hidden className="size-3" />
          </span>
          <p className="font-display text-sm text-ink">{title}</p>
        </div>
        <span className="text-[10px] uppercase tracking-[0.12em] text-ink-soft">
          prévia
        </span>
      </div>
      <div className="flex flex-1 flex-col px-3 py-3">{children}</div>
    </article>
  );
}

function PreviewHoje() {
  return (
    <PreviewChrome title="Hoje">
      <p className="text-[11px] font-medium text-ink-soft">Conversa recente</p>
      <div className="mt-2 rounded-xl border border-wine/20 bg-wine/[0.04] px-3 py-2.5">
        <p className="text-sm font-medium text-ink">Decisão e rotina familiar</p>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-soft">
          Renda, tempo em casa — continue de onde parou.
        </p>
        <p className="mt-2 text-sm font-medium text-wine">Continuar conversa</p>
      </div>
      <p className="mt-auto pt-3 text-xs text-ink-soft">Nova reflexão</p>
    </PreviewChrome>
  );
}

function PreviewHistorico() {
  return (
    <PreviewChrome title="Histórico">
      <div className="rounded-xl border border-border/70 bg-card/70 px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-ink">Decisão e rotina familiar</p>
          <time className="shrink-0 text-[10px] text-ink-soft">há 2 dias</time>
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-soft">
          Conversa salva para retomar o mesmo fio.
        </p>
        <p className="mt-2 text-sm text-ink-soft">Retomar conversa</p>
      </div>
      <p className="mt-auto pt-3 text-xs text-ink-soft">Privado</p>
    </PreviewChrome>
  );
}

function PreviewJornada() {
  return (
    <PreviewChrome title="Jornada">
      <p className="text-sm font-medium text-ink">Perdão e limites</p>
      <p className="mt-1 text-xs text-ink-soft">Jornada guiada · 7 etapas</p>
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] text-ink-soft">
          <span>Progresso</span>
          <span>3/7</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sand-100">
          <div className="h-full w-[43%] rounded-full bg-wine/80" />
        </div>
      </div>
      <div className="mt-3 rounded-xl border border-border/70 bg-card/70 px-3 py-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-soft">
          Próxima etapa
        </p>
        <p className="mt-1 text-sm text-ink">Sem reconciliação automática</p>
      </div>
      <p className="mt-auto pt-3 text-xs text-ink-soft">
        Disponível no Caminho e no Profundo
      </p>
    </PreviewChrome>
  );
}

function PreviewAprofundar() {
  return (
    <PreviewChrome
      title="Aprofundar"
      className="border-gold/35 bg-gradient-to-b from-sand-50 to-sand-100/80"
    >
      <p className="inline-flex w-fit rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-ink">
        Disponível no Profundo
      </p>
      <p className="mt-2 text-sm font-medium text-ink">Aprofundar este tema</p>
      <p className="mt-1 text-xs leading-relaxed text-ink-soft">
        Segunda passagem sob demanda: mais contexto, tensões e passos.
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-sand-100 px-2 py-1 text-[10px] text-ink-soft">
          <BookOpen aria-hidden className="size-3" />
          Referências
        </span>
        <span className="rounded-full bg-sand-100 px-2 py-1 text-[10px] text-ink-soft">
          Tensões
        </span>
      </div>
      <p className="mt-auto pt-3 text-xs text-ink-soft">
        Só no Profundo — não no Essencial nem no Caminho
      </p>
    </PreviewChrome>
  );
}

const PREVIEWS = [
  { key: "hoje", label: "Hoje", node: <PreviewHoje /> },
  { key: "historico", label: "Histórico", node: <PreviewHistorico /> },
  { key: "jornada", label: "Jornada", node: <PreviewJornada /> },
  { key: "aprofundar", label: "Aprofundar", node: <PreviewAprofundar /> },
] as const;

export function PaidLandingContinuity() {
  return (
    <section
      id="continuidade"
      className="border-b border-border/40"
      aria-labelledby="continuidade-heading"
    >
      <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-9">
        <ConversationEyebrow>Continuidade</ConversationEyebrow>
        <h2
          id="continuidade-heading"
          className="mt-2 font-display text-2xl text-ink sm:text-3xl"
        >
          Volte ao mesmo fio quando precisar.
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft sm:text-base">
          Histórico, Jornadas e Aprofundar mantêm sua reflexão organizada
          conforme o plano.
        </p>

        {/* Mobile: horizontal snap strip with next frame peek */}
        <div
          className="mt-5 -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:hidden"
          role="region"
          aria-label="Prévia das superfícies do produto"
          tabIndex={0}
        >
          {PREVIEWS.map((item) => (
            <div
              key={item.key}
              className="w-[78%] max-w-[18.5rem] shrink-0 snap-start"
            >
              {item.node}
            </div>
          ))}
          <div className="w-2 shrink-0" aria-hidden />
        </div>
        {/* Desktop: uneven product grid */}
        <div className="mt-6 hidden gap-4 md:grid md:grid-cols-2">
          <div className="md:row-span-1">{PREVIEWS[0].node}</div>
          <div>{PREVIEWS[1].node}</div>
          <div>{PREVIEWS[2].node}</div>
          <div>{PREVIEWS[3].node}</div>
        </div>

        <ul className="mt-5 flex flex-col gap-1.5 text-sm text-ink-soft sm:flex-row sm:flex-wrap sm:gap-x-5">
          <li>Parte da sua situação.</li>
          <li>Faz perguntas para aprofundar.</li>
          <li>Mantém contexto e continuidade.</li>
        </ul>
      </div>
    </section>
  );
}
