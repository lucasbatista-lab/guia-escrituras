import { BookOpen, ChevronRight, LockKeyhole, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/** Eyebrow for section rhythm — “a conversa que continua”. */
export function ConversationEyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-[11px] font-medium uppercase tracking-[0.16em] text-wine",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Vertical continuity thread connecting moments of the page. */
export function ContinuityThread({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("relative", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-2 left-[11px] top-2 w-px bg-gradient-to-b from-gold/50 via-wine/25 to-gold/40 sm:left-[13px]"
      />
      <div className="relative space-y-5 sm:space-y-6">{children}</div>
    </div>
  );
}

export function ContinuityMoment({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative pl-8 sm:pl-9", className)}>
      <span
        aria-hidden
        className="absolute left-0 top-1.5 flex size-[23px] items-center justify-center rounded-full border border-gold/45 bg-sand-50 sm:size-[27px]"
      >
        <span className="size-1.5 rounded-full bg-wine sm:size-2" />
      </span>
      <p className="font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-ink-soft">
        {label}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function UserBubble({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "ml-auto max-w-[92%] rounded-2xl rounded-br-sm bg-ink px-3.5 py-2.5 font-chat text-[0.95rem] leading-relaxed text-sand-50",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function GuideBubble({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-[94%] rounded-2xl rounded-bl-sm border border-border/60 bg-white/85 px-3.5 py-3 font-chat text-[0.95rem] leading-relaxed text-ink shadow-[0_10px_28px_-22px_rgba(44,36,28,0.45)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ScriptureChip({
  children,
  withIcon = false,
}: {
  children: ReactNode;
  withIcon?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sand-100 px-2 py-1 font-sans text-[11px] text-ink-soft">
      {withIcon ? <BookOpen aria-hidden className="size-3" /> : null}
      {children}
    </span>
  );
}

export function NextStepBlock({
  title = "Próximos passos possíveis",
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-3 border-t border-border/60 pt-2.5 font-sans text-[12px] text-ink-soft",
        className,
      )}
    >
      <p className="font-medium text-ink">{title}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export function ContinuityMarker({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-sand-100/80 px-3 py-1.5 font-sans text-[11px] text-ink-soft",
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-gold" />
      {children}
    </p>
  );
}

export function ContinuitySurface({
  title,
  detail,
  active = false,
}: {
  title: string;
  detail: string;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5",
        active
          ? "border-wine/25 bg-wine/[0.06]"
          : "border-border/60 bg-card/50",
      )}
    >
      <p
        className={cn(
          "font-display text-sm",
          active ? "text-wine" : "text-ink",
        )}
      >
        {title}
      </p>
      <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{detail}</p>
    </div>
  );
}

export function ProductFrame({
  children,
  caption,
  compact = false,
  className,
}: {
  children: ReactNode;
  caption?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative mx-auto w-full", className)}>
      <div
        aria-hidden
        className="absolute -inset-4 rounded-[2.75rem] bg-[radial-gradient(circle_at_50%_30%,rgba(198,160,90,0.28),transparent_62%)] blur-2xl motion-safe:opacity-100"
      />
      <div className="relative overflow-hidden rounded-[1.85rem] border border-ink/15 bg-ink p-1.5 shadow-[0_28px_70px_-30px_rgba(44,36,28,0.55)] sm:rounded-[2rem]">
        <div
          className={cn(
            "overflow-hidden rounded-[1.5rem] bg-sand-50 sm:rounded-[1.65rem]",
            compact ? "min-h-[16rem]" : "min-h-[17.5rem] sm:min-h-[20rem]",
          )}
        >
          {children}
        </div>
      </div>
      {caption ? (
        <p className="mt-2 text-center text-[10px] tracking-wide text-ink-soft">
          {caption}
        </p>
      ) : null}
    </div>
  );
}

export function ProductFrameHeader({
  status = "Reflexão em andamento",
}: {
  status?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border/70 px-3.5 py-2.5 sm:px-4 sm:py-3">
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-full bg-wine text-sand-50 sm:size-8">
          <Sparkles aria-hidden className="size-3.5 sm:size-4" />
        </span>
        <div>
          <p className="font-display text-sm leading-none text-ink">Amém Chat</p>
          <p className="mt-1 text-[10px] text-ink-soft">{status}</p>
        </div>
      </div>
      <span className="inline-flex items-center gap-1 text-[10px] text-ink-soft">
        <LockKeyhole aria-hidden className="size-3" />
        privada
      </span>
    </div>
  );
}

export function ProductFrameNav({
  active = "Conversar",
}: {
  active?: "Conversar" | "Jornadas" | "Histórico";
}) {
  const items = ["Conversar", "Jornadas", "Histórico"] as const;
  return (
    <div className="grid grid-cols-3 border-t border-border/70 bg-card/80 px-2 py-2">
      {items.map((item) => {
        const isActive = item === active;
        return (
          <span
            key={item}
            className={cn(
              "flex items-center justify-center gap-1 rounded-lg px-1 py-2 text-[10px]",
              isActive
                ? "bg-wine/[0.08] font-medium text-wine"
                : "text-ink-soft",
            )}
          >
            {item}
            {isActive ? (
              <ChevronRight aria-hidden className="size-3" />
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

/** Compact product poster for the paid landing hero (no live AI). */
export function PaidLandingProductPoster({
  className,
}: {
  className?: string;
}) {
  return (
    <ProductFrame
      className={cn("max-w-md", className)}
      caption="Exemplo ilustrativo fiel à experiência do produto"
    >
      <ProductFrameHeader />
      <div className="space-y-2.5 px-3 py-3 font-chat text-[12.5px] leading-relaxed sm:space-y-3 sm:px-3.5 sm:py-3.5 sm:text-[13px]">
        <UserBubble className="max-w-[90%] px-3 py-2 text-[12.5px] sm:text-[13px]">
          Preciso decidir se aceito um trabalho que melhora a renda, mas afasta
          a família durante a semana.
        </UserBubble>
        <GuideBubble className="max-w-[94%] px-3 py-2.5 text-[12.5px] sm:text-[13px]">
          <p>
            O que mais pesa agora: a pressão financeira, o tempo com quem você
            ama, ou o medo de se arrepender depois?
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <ScriptureChip withIcon>Tiago 1:5</ScriptureChip>
            <ScriptureChip>Provérbios 3:5–6</ScriptureChip>
          </div>
          <NextStepBlock title="Próximo passo" className="text-[11px]">
            <p>Nomeie o critério mínimo que a decisão precisa respeitar.</p>
          </NextStepBlock>
        </GuideBubble>
      </div>
      <ProductFrameNav />
    </ProductFrame>
  );
}

export function PaidLandingSection({
  id,
  eyebrow,
  title,
  description,
  children,
  className,
  tone = "plain",
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  tone?: "plain" | "soft" | "ink";
}) {
  return (
    <section
      id={id}
      className={cn(
        tone === "soft" && "border-y border-border/40 bg-sand-100/45",
        tone === "ink" && "border-t border-border/50 bg-ink text-sand-50",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10",
          id && "scroll-mt-6 sm:scroll-mt-8",
        )}
      >
        {eyebrow ? <ConversationEyebrow>{eyebrow}</ConversationEyebrow> : null}
        <h2
          className={cn(
            "font-display text-2xl sm:text-3xl",
            eyebrow && "mt-2",
            tone === "ink" ? "text-sand-50" : "text-ink",
          )}
        >
          {title}
        </h2>
        {description ? (
          <p
            className={cn(
              "mt-2 max-w-2xl text-sm leading-relaxed sm:text-base",
              tone === "ink" ? "text-sand-50/80" : "text-ink-soft",
            )}
          >
            {description}
          </p>
        ) : null}
        {children ? <div className="mt-5 sm:mt-6">{children}</div> : null}
      </div>
    </section>
  );
}
