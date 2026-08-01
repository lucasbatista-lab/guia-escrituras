"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import { CONSENT_COPY } from "@/lib/consent";
import { useConsent } from "./consent-context";
import { ConsentPreferencesPanel } from "./consent-preferences";

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
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,var(--safe-bottom))] pt-2 sm:px-4"
      role="region"
      aria-labelledby={titleId}
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-border/80 bg-sand-50/98 p-4 shadow-[0_-12px_40px_-24px_rgba(44,36,28,0.45)] backdrop-blur-md sm:p-5">
        {preferencesOpen ? (
          <ConsentPreferencesPanel titleId={titleId} />
        ) : (
          <>
            <h2 id={titleId} className="font-display text-lg text-ink">
              Cookies e publicidade
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              {CONSENT_COPY.banner}{" "}
              <Link
                href="/cookies"
                className="text-ink underline underline-offset-4"
              >
                Saiba mais
              </Link>
              .
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-4 text-sm font-medium text-sand-50 transition hover:bg-ink/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onClick={acceptAdvertising}
              >
                {CONSENT_COPY.accept}
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-ink transition hover:bg-sand-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onClick={refuseAdvertising}
              >
                {CONSENT_COPY.refuse}
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-medium text-ink-soft underline-offset-4 transition hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
