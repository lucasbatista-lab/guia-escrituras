"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef } from "react";
import { CONSENT_COPY } from "@/lib/consent";
import { useConsent } from "./consent-context";
import { ConsentPreferencesPanel } from "./consent-preferences";
import { cn } from "@/lib/utils";

const CAMPAIGN_BANNER_COPY =
  "Usamos cookies necessários. Com sua autorização, também medimos campanhas de publicidade.";

/**
 * Global consent banner. On paid campaign surfaces (/comece, /comece-v2),
 * uses a compact presentation so the first fold remains usable —
 * same opt-in semantics, no dark patterns.
 */
export function ConsentBanner() {
  const {
    ready,
    bannerVisible,
    preferencesOpen,
    acceptAdvertising,
    refuseAdvertising,
    openPreferences,
    closePreferences,
  } = useConsent();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const authCompact =
    pathname === "/entrar" ||
    pathname === "/cadastro" ||
    pathname === "/confira-seu-email" ||
    pathname === "/email-confirmado" ||
    pathname === "/recuperar-senha" ||
    pathname === "/redefinir-senha";
  const campaignCompact =
    pathname === "/comece" ||
    pathname === "/comece-v2" ||
    authCompact;

  useEffect(() => {
    if (!bannerVisible && !preferencesOpen) return;
    const node = panelRef.current;
    const focusable = node?.querySelector<HTMLElement>(
      "button, a, [href], input, select, textarea",
    );
    focusable?.focus();
  }, [bannerVisible, preferencesOpen]);

  useEffect(() => {
    if (!preferencesOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closePreferences();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePreferences, preferencesOpen]);

  if (!ready) return null;
  if (!bannerVisible && !preferencesOpen) return null;

  return (
    <div
      ref={panelRef}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 px-2 pb-[max(0.25rem,var(--safe-bottom))] pt-0.5 sm:px-4 sm:pb-[max(0.75rem,var(--safe-bottom))] sm:pt-2",
        campaignCompact && "sm:px-3 sm:pb-[max(0.5rem,var(--safe-bottom))] sm:pt-1",
      )}
      role="region"
      aria-labelledby={titleId}
      data-consent-variant={campaignCompact ? "campaign" : "default"}
    >
      <div
        className={cn(
          "mx-auto max-w-3xl rounded-2xl border border-border/80 bg-sand-50/98 shadow-[0_-10px_32px_-22px_rgba(44,36,28,0.4)] backdrop-blur-md",
          campaignCompact ? "p-2 sm:p-3" : "p-2 sm:p-5",
        )}
      >
        {preferencesOpen ? (
          <ConsentPreferencesPanel titleId={titleId} />
        ) : campaignCompact ? (
          <>
            <h2 id={titleId} className="sr-only">
              Cookies e publicidade
            </h2>
            <p className="text-[12px] leading-snug text-ink-soft">
              {CAMPAIGN_BANNER_COPY}{" "}
              <Link
                href="/cookies"
                className="text-ink underline underline-offset-4"
              >
                Saiba mais
              </Link>
              .
            </p>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-background px-2 text-sm font-medium text-ink transition hover:bg-sand-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onClick={refuseAdvertising}
              >
                {CONSENT_COPY.refuse}
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-2 text-sm font-medium text-sand-50 transition hover:bg-ink/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onClick={acceptAdvertising}
              >
                {CONSENT_COPY.accept}
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center rounded-md px-2 text-sm font-medium text-ink-soft underline-offset-4 transition hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onClick={openPreferences}
              >
                {CONSENT_COPY.configure}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <h2
                id={titleId}
                className="font-display text-[0.9rem] leading-tight text-ink sm:text-lg"
              >
                Cookies e publicidade
              </h2>
            </div>
            <p className="mt-1 text-[12px] leading-snug text-ink-soft sm:mt-2 sm:text-sm sm:leading-relaxed">
              {CONSENT_COPY.banner}{" "}
              <Link
                href="/cookies"
                className="text-ink underline underline-offset-4"
              >
                Saiba mais
              </Link>
              .
            </p>
            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:mt-4 sm:flex sm:flex-row sm:flex-wrap sm:gap-2">
              <button
                type="button"
                className="col-span-1 inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-3 text-sm font-medium text-sand-50 transition hover:bg-ink/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:px-4"
                onClick={acceptAdvertising}
              >
                {CONSENT_COPY.accept}
              </button>
              <button
                type="button"
                className="col-span-1 inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium text-ink transition hover:bg-sand-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:px-4"
                onClick={refuseAdvertising}
              >
                {CONSENT_COPY.refuse}
              </button>
              <button
                type="button"
                className="col-span-2 inline-flex min-h-10 items-center justify-center rounded-md px-3 text-sm font-medium text-ink-soft underline-offset-4 transition hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:min-h-11 sm:justify-start sm:px-4"
                onClick={openPreferences}
              >
                {CONSENT_COPY.configure}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
