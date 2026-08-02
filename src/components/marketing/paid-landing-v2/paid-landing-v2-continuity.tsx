"use client";

import { BookOpen, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Premium continuity system for V2 — reuses the product-surface idea
 * from /comece with larger interfaces and a clearer exit to the offer.
 */

function PreviewChrome({
  title,
  children,
  className,
  accent = false,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <article
      className={cn(
        "flex h-full min-h-[17.5rem] flex-col overflow-hidden rounded-[1.45rem] border bg-sand-50 shadow-[0_22px_48px_-32px_rgba(44,36,28,0.65)]",
        accent ? "border-gold/40" : "border-ink/12",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border/70 bg-card/80 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-wine text-sand-50">
            <Sparkles aria-hidden className="size-3.5" />
          </span>
          <p className="font-sans text-sm font-semibold text-ink">{title}</p>
        </div>
        <span className="text-[10px] uppercase tracking-[0.12em] text-ink-soft">
          prévia
        </span>
      </div>
      <div className="flex flex-1 flex-col px-3.5 py-3.5">{children}</div>
    </article>
  );
}

function PreviewHoje() {
  return (
    <PreviewChrome title="Hoje">
      <p className="text-[11px] font-medium text-ink-soft">Conversa recente</p>
      <div className="mt-2.5 rounded-xl border border-wine/20 bg-wine/[0.04] px-3.5 py-3">
        <p className="text-sm font-medium text-ink">Perdão e convivência</p>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-soft">
          Limites, confiança — continue de onde parou.
        </p>
        <p className="mt-2.5 text-sm font-medium text-wine">Continuar conversa</p>
      </div>
      <p className="mt-auto pt-3 text-xs text-ink-soft">Nova reflexão</p>
    </PreviewChrome>
  );
}

function PreviewHistorico() {
  return (
    <PreviewChrome title="Histórico">
      <div className="rounded-xl border border-border/70 bg-card/70 px-3.5 py-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-ink">Perdão e convivência</p>
          <time className="shrink-0 text-[10px] text-ink-soft">há 2 dias</time>
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-soft">
          Conversa salva para retomar o mesmo fio.
        </p>
        <p className="mt-2.5 text-sm text-ink-soft">Retomar conversa</p>
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
      <div className="mt-3.5">
        <div className="flex items-center justify-between text-[11px] text-ink-soft">
          <span>Progresso</span>
          <span>3/7</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sand-100">
          <div className="h-full w-[43%] rounded-full bg-wine/80" />
        </div>
      </div>
      <div className="mt-3.5 rounded-xl border border-border/70 bg-card/70 px-3.5 py-2.5">
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
      accent
      className="bg-gradient-to-b from-sand-50 to-sand-100/85"
    >
      <p className="inline-flex w-fit rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-[10px] font-medium tracking-wide text-ink">
        Disponível no Profundo
      </p>
      <p className="mt-2.5 text-sm font-medium text-ink">Aprofundar este tema</p>
      <p className="mt-1 text-xs leading-relaxed text-ink-soft">
        Segunda passagem sob demanda: mais contexto, tensões e passos.
      </p>
      <div className="mt-3.5 flex flex-wrap gap-1.5">
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

export function PaidLandingV2Continuity() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;

    const items = Array.from(
      root.querySelectorAll<HTMLElement>("[data-preview-card-v2]"),
    );
    if (!items.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible?.target) return;
        const index = items.indexOf(visible.target as HTMLElement);
        if (index >= 0) setActiveIndex(index);
      },
      {
        root,
        threshold: [0.45, 0.7],
        rootMargin: "0px -20% 0px -10%",
      },
    );

    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  function goTo(index: number) {
    const root = scrollerRef.current;
    if (!root) return;
    const item = root.querySelectorAll<HTMLElement>("[data-preview-card-v2]")[
      index
    ];
    item?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      inline: "start",
      block: "nearest",
    });
  }

  return (
    <section
      id="continuidade-v2"
      className="relative overflow-hidden bg-ink text-sand-50"
      aria-labelledby="continuidade-v2-heading"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_12%_0%,rgba(198,160,90,0.2),transparent_44%),radial-gradient(ellipse_at_92%_78%,rgba(107,46,58,0.4),transparent_52%)]"
      />
      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:py-16">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gold">
          Continue sem começar do zero
        </p>
        <h2
          id="continuidade-v2-heading"
          className="mt-2 max-w-xl font-sans text-[1.55rem] font-semibold leading-snug tracking-tight text-sand-50 sm:text-[1.9rem] lg:text-[2.25rem]"
        >
          Volte ao mesmo fio quando precisar.
        </h2>
        <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-sand-50/72 sm:text-base">
          Histórico, Jornadas e Aprofundar ajudam a manter sua reflexão
          organizada conforme o plano.
        </p>

        <div
          ref={scrollerRef}
          className="mt-7 -mx-4 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-4 pb-2 md:hidden"
          role="region"
          aria-label="Prévia das superfícies do produto"
          tabIndex={0}
        >
          {PREVIEWS.map((item, index) => (
            <div
              key={item.key}
              data-preview-card-v2
              className="w-[82%] max-w-[20rem] shrink-0 snap-start"
              aria-label={`${item.label} (${index + 1} de ${PREVIEWS.length})`}
            >
              {item.node}
            </div>
          ))}
          <div className="w-3 shrink-0" aria-hidden />
        </div>

        <div className="mt-3.5 flex items-center justify-between gap-3 md:hidden">
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Superfícies">
            {PREVIEWS.map((item, index) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={index === activeIndex}
                aria-label={`Ver ${item.label}`}
                onClick={() => goTo(index)}
                className={cn(
                  "flex min-h-11 min-w-11 items-center justify-center rounded-full transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold",
                )}
              >
                <span
                  className={cn(
                    "block h-2 rounded-full transition-all",
                    index === activeIndex
                      ? "w-6 bg-gold"
                      : "w-2 bg-sand-50/35",
                  )}
                  aria-hidden
                />
              </button>
            ))}
          </div>
          <p className="text-[11px] tracking-wide text-sand-50/65">
            {PREVIEWS[activeIndex]?.label} · {activeIndex + 1}/4
          </p>
        </div>

        <div className="mt-8 hidden gap-4 md:grid md:grid-cols-2 lg:gap-5">
          <div className="md:translate-y-1">{PREVIEWS[0].node}</div>
          <div>{PREVIEWS[1].node}</div>
          <div>{PREVIEWS[2].node}</div>
          <div className="md:-translate-y-1">{PREVIEWS[3].node}</div>
        </div>

        <div className="mt-8 flex flex-col gap-2.5 sm:mt-9 sm:flex-row sm:items-center sm:gap-4">
          <Button
            asChild
            size="lg"
            className="min-h-12 bg-sand-50 px-6 text-ink hover:bg-sand-100"
          >
            <a href="#planos-v2">Ver os planos</a>
          </Button>
          <p className="text-xs leading-snug text-sand-50/65 sm:text-sm">
            Jornadas no Caminho e no Profundo. Aprofundar no Profundo.
          </p>
        </div>
      </div>
    </section>
  );
}
