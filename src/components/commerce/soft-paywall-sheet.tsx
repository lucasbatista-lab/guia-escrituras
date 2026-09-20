"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { PremiumBadge } from "@/components/commerce/premium-badge";
import { LockPill } from "@/components/commerce/lock-pill";
import { Button } from "@/components/ui/button";
import type { SoftPaywallCopy } from "@/lib/commerce/soft-paywall";
import { cn } from "@/lib/utils";

type SoftPaywallSheetProps = {
  copy: SoftPaywallCopy;
  /** When true, sheet opens on mount (FREE gate). */
  defaultOpen?: boolean;
  className?: string;
};

/**
 * Soft paywall action sheet — dismissible without losing free-account value.
 * Does not claim free plan is absent. Gold CTA only at the plans door.
 */
export function SoftPaywallSheet({
  copy,
  defaultOpen = true,
  className,
}: SoftPaywallSheetProps) {
  const [open, setOpen] = useState(defaultOpen);
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);

  const dismiss = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismiss]);

  useEffect(() => {
    if (open && sheetRef.current) {
      sheetRef.current.focus();
    }
  }, [open]);

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "rounded-2xl border border-border/70 bg-card/70 p-5",
          open && "pointer-events-none select-none opacity-55 blur-[2px]",
        )}
        aria-hidden={open}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
              {copy.resourceLabel}
            </p>
            <h1 className="mt-2 font-display text-2xl text-ink">{copy.title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Disponível a partir do plano {copy.minimumPlanName}. Sua conta
              grátis permanece com Hoje com Deus, Orações, Diário e Salvos.
            </p>
          </div>
          <LockPill label={copy.minimumPlanName} />
        </div>
        {!open ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              type="button"
              className="min-h-11"
              onClick={() => setOpen(true)}
            >
              Ver como desbloquear
            </Button>
            <Button asChild variant="outline" className="min-h-11">
              <Link href={copy.dismissHref}>{copy.dismissLabel}</Link>
            </Button>
          </div>
        ) : null}
      </div>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default border-0 bg-[color:var(--amem-lock-scrim,rgba(44,36,28,0.45))] p-0"
            aria-label="Fechar painel"
            onClick={dismiss}
          />
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg outline-none"
          >
            <div
              className="rounded-t-[28px] border border-border/80 bg-[color:var(--amem-surface,#FFFCF7)] px-5 pb-[max(1.25rem,var(--safe-bottom))] pt-3 shadow-[var(--amem-sh-float,0_14px_40px_rgba(44,36,28,0.14))]"
              style={{
                transition: `transform var(--amem-dur-base, 220ms) var(--amem-ease-presence, cubic-bezier(0.22, 0.61, 0.36, 1))`,
              }}
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-sand-200" aria-hidden />
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
                  <span
                    aria-hidden
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: "var(--amem-gold-500, #C6A05A)" }}
                  />
                  {copy.eyebrow}
                </p>
                <PremiumBadge label={copy.badgeLabel} />
              </div>
              <h2 id={titleId} className="mt-2 font-display text-[1.3125rem] text-ink">
                {copy.title}
              </h2>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">
                {copy.body}
              </p>
              <p className="mt-2 text-xs text-ink-soft">
                Recurso: <span className="font-medium text-ink">{copy.resourceLabel}</span>
                {" · "}
                Plano mínimo:{" "}
                <span className="font-medium text-ink">{copy.minimumPlanName}</span>
              </p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[0.9375rem] leading-relaxed text-ink-soft">
                {copy.benefits.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Button
                asChild
                className="mt-4 min-h-11 w-full border-0 text-base font-semibold text-ink shadow-sm"
                style={{
                  background: "var(--amem-gold-500, #C6A05A)",
                }}
              >
                <Link href={copy.ctaHref}>{copy.ctaLabel}</Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="mt-1 min-h-11 w-full text-ink-soft"
                onClick={dismiss}
              >
                {copy.dismissLabel}
              </Button>
              <p className="mt-3 text-center text-[0.8125rem] text-ink-soft">
                {copy.footerNote}
              </p>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
