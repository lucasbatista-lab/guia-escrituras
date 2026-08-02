"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

function subscribeConsentBanner(listener: () => void) {
  const root = document.documentElement;
  const observer = new MutationObserver(listener);
  observer.observe(root, {
    attributes: true,
    attributeFilter: ["data-consent-banner-open"],
  });
  return () => observer.disconnect();
}

function getConsentBannerOpen() {
  return (
    document.documentElement.getAttribute("data-consent-banner-open") === "true"
  );
}

function getConsentBannerServerSnapshot() {
  return false;
}

function sectionInView(id: string, topPad = 0, bottomPad = 0.2): boolean {
  const el = document.getElementById(id);
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight || 1;
  return rect.top < vh * (1 - bottomPad) && rect.bottom > topPad;
}

/**
 * Compact floating purchase action for V2 mobile.
 * Plan-neutral: scrolls to #planos-v2 without selecting a plan or firing
 * paid_landing_* events (preview isolation).
 */
export function PaidLandingV2Sticky() {
  const [visible, setVisible] = useState(false);
  const consentOpen = useSyncExternalStore(
    subscribeConsentBanner,
    getConsentBannerOpen,
    getConsentBannerServerSnapshot,
  );

  useEffect(() => {
    function update() {
      const heroCta = document.querySelector(
        '#comece-v2-hero a[href="#planos-v2"]',
      );
      if (!heroCta) {
        setVisible(false);
        return;
      }
      const heroRect = heroCta.getBoundingClientRect();
      const heroCtaLeft = heroRect.bottom < 8;
      const plansVisible = sectionInView("planos-v2", 48, 0.15);
      const nearFinalCta = sectionInView("comece-v2-final-cta", 48, 0.1);
      const onForm = Boolean(
        document.activeElement &&
          (document.activeElement.tagName === "INPUT" ||
            document.activeElement.tagName === "TEXTAREA" ||
            document.activeElement.tagName === "SELECT"),
      );
      const dialogOpen = Boolean(
        document.querySelector('[role="dialog"], [aria-modal="true"]'),
      );
      const videoControls = Boolean(
        document.activeElement &&
          document.activeElement.closest("video, [controls]"),
      );
      setVisible(
        heroCtaLeft &&
          !plansVisible &&
          !nearFinalCta &&
          !onForm &&
          !dialogOpen &&
          !videoControls,
      );
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    window.addEventListener("focusin", update);
    window.addEventListener("focusout", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("focusin", update);
      window.removeEventListener("focusout", update);
    };
  }, []);

  const show = visible && !consentOpen;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(0.75rem,var(--safe-bottom))] pt-2 md:hidden",
        "transition-opacity duration-200 motion-reduce:transition-none",
        show ? "opacity-100" : "opacity-0",
      )}
      aria-hidden={!show}
    >
      <a
        href="#planos-v2"
        tabIndex={show ? 0 : -1}
        aria-label="Escolher meu plano — opções a partir de R$38 por mês"
        className={cn(
          "pointer-events-auto inline-flex h-12 min-h-11 items-center justify-center rounded-full bg-wine px-6 text-sm font-medium text-sand-50",
          "shadow-[0_14px_36px_-14px_rgba(107,46,58,0.85)] transition hover:bg-wine-soft",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50",
          !show && "pointer-events-none",
        )}
      >
        Escolher meu plano
      </a>
    </div>
  );
}
