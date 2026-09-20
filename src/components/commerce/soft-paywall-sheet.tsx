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

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function listFocusable(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true",
  );
}

type ScrollLockSnapshot = {
  bodyOverflow: string;
  bodyPosition: string;
  bodyTop: string;
  bodyWidth: string;
  htmlOverflow: string;
  scrollY: number;
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
  const descriptionId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);

  const dismiss = useCallback(() => {
    setOpen(false);
  }, []);

  const openSheet = useCallback(() => {
    restoreFocusRef.current =
      (document.activeElement as HTMLElement | null) ?? triggerRef.current;
    setOpen(true);
  }, []);

  // Focus restore to trigger (or prior activeElement) when sheet closes.
  useEffect(() => {
    if (wasOpen.current && !open) {
      const target = restoreFocusRef.current ?? triggerRef.current;
      if (target && document.contains(target)) {
        target.focus();
      }
      restoreFocusRef.current = null;
    }
    wasOpen.current = open;
  }, [open]);

  // On default-open mount there is usually no meaningful trigger yet; leave
  // restoreFocusRef null so close restores to the re-open control when present.
  useEffect(() => {
    if (!defaultOpen) return;
    const active = document.activeElement as HTMLElement | null;
    if (
      active &&
      active !== document.body &&
      active !== document.documentElement
    ) {
      restoreFocusRef.current = active;
    }
  }, [defaultOpen]);

  // Focus trap, ESC, body scroll lock (incl. mobile Safari position:fixed).
  useEffect(() => {
    if (!open) return;

    const sheet = sheetRef.current;
    const scrollY = window.scrollY;
    const snapshot: ScrollLockSnapshot = {
      bodyOverflow: document.body.style.overflow,
      bodyPosition: document.body.style.position,
      bodyTop: document.body.style.top,
      bodyWidth: document.body.style.width,
      htmlOverflow: document.documentElement.style.overflow,
      scrollY,
    };

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    requestAnimationFrame(() => {
      const first = listFocusable(sheet)[0];
      (first ?? sheet)?.focus();
    });

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
        return;
      }
      if (event.key !== "Tab" || !sheet) return;
      const focusables = listFocusable(sheet);
      if (focusables.length === 0) {
        event.preventDefault();
        sheet.focus();
        return;
      }
      const firstEl = focusables[0]!;
      const lastEl = focusables[focusables.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey) {
        if (active === firstEl || !sheet.contains(active)) {
          event.preventDefault();
          lastEl.focus();
        }
        return;
      }
      if (active === lastEl || !sheet.contains(active)) {
        event.preventDefault();
        firstEl.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = snapshot.htmlOverflow;
      document.body.style.overflow = snapshot.bodyOverflow;
      document.body.style.position = snapshot.bodyPosition;
      document.body.style.top = snapshot.bodyTop;
      document.body.style.width = snapshot.bodyWidth;
      window.scrollTo(0, snapshot.scrollY);
    };
  }, [open, dismiss]);

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
              ref={triggerRef}
              type="button"
              className="min-h-11"
              onClick={openSheet}
            >
              Ver como desbloquear
            </Button>
            <Button asChild variant="outline" className="min-h-11">
              <Link href={copy.dismissHref}>{copy.leaveLabel}</Link>
            </Button>
          </div>
        ) : null}
      </div>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default border-0 p-0 backdrop-blur-[6px]"
            style={{ background: "rgba(247,245,241,0.42)" }}
            aria-label="Fechar painel"
            tabIndex={-1}
            onClick={dismiss}
          />
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            tabIndex={-1}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg outline-none"
          >
            <div
              className="rounded-t-[28px] bg-[color:var(--amem-surface,#FFFDFC)] px-[22px] pb-[max(2.5rem,var(--safe-bottom))] pt-7 shadow-[0_-18px_48px_rgba(25,22,19,0.14),inset_0_1px_0_rgba(255,255,255,0.9)]"
              style={{
                transition: `transform var(--amem-dur-base, 220ms) var(--amem-ease-presence, cubic-bezier(0.22, 0.61, 0.36, 1))`,
              }}
            >
              <div
                className="mx-auto mb-[18px] h-1 w-9 rounded-full bg-[rgba(25,22,19,0.12)]"
                aria-hidden
              />
              <div
                aria-hidden
                className="mb-[18px] h-1 w-10 rounded"
                style={{
                  background:
                    "linear-gradient(90deg, var(--amem-wine-deep), var(--amem-brass))",
                }}
              />
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-wine">
                {copy.eyebrow}
              </p>
              <h2
                id={titleId}
                className="mt-2 text-2xl font-bold tracking-[-0.025em] leading-tight text-ink"
              >
                {copy.title}
              </h2>
              <p
                id={descriptionId}
                className="mt-2.5 text-[15px] leading-relaxed text-ink-soft"
              >
                {copy.body}
              </p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-xs text-[color:var(--amem-mute)]">
                  Recurso:{" "}
                  <span className="font-medium text-ink">{copy.resourceLabel}</span>
                  {" · "}
                  Plano mínimo:{" "}
                  <span className="font-medium text-ink">{copy.minimumPlanName}</span>
                </p>
                <PremiumBadge label={copy.badgeLabel} />
              </div>
              <ul className="sr-only">
                {copy.benefits.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Button
                asChild
                variant="premium"
                className="mt-[22px] min-h-[52px] w-full text-[15px] font-bold"
              >
                <Link href={copy.ctaHref}>{copy.ctaLabel}</Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="mt-2.5 min-h-[52px] w-full"
                onClick={dismiss}
              >
                {copy.dismissLabel}
              </Button>
              <p className="mt-3 text-center text-[0.8125rem] text-[color:var(--amem-mute)]">
                {copy.footerNote}
              </p>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
