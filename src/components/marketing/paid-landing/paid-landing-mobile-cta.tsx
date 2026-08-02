"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { PaidLandingFixedCta } from "./paid-landing-scroll-cta";

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
  return document.documentElement.getAttribute("data-consent-banner-open") === "true";
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
 * Mobile sticky CTA — appears after the hero primary CTA leaves the viewport.
 * Plan-neutral: scrolls to #planos without selecting Caminho.
 */
export function PaidLandingMobileCta() {
  const [visible, setVisible] = useState(false);
  const consentOpen = useSyncExternalStore(
    subscribeConsentBanner,
    getConsentBannerOpen,
    getConsentBannerServerSnapshot,
  );

  useEffect(() => {
    function update() {
      const heroCta = document.querySelector(
        '#comece-hero a[href="#planos"]',
      );
      if (!heroCta) {
        setVisible(false);
        return;
      }
      const heroRect = heroCta.getBoundingClientRect();
      const heroCtaLeft = heroRect.bottom < 8;
      const plansVisible = sectionInView("planos", 48, 0.15);
      const nearFinalCta = sectionInView("comece-final-cta", 48, 0.1);
      const onForm = Boolean(
        document.activeElement &&
          (document.activeElement.tagName === "INPUT" ||
            document.activeElement.tagName === "TEXTAREA" ||
            document.activeElement.tagName === "SELECT"),
      );
      const dialogOpen = Boolean(
        document.querySelector('[role="dialog"], [aria-modal="true"]'),
      );
      setVisible(
        heroCtaLeft &&
          !plansVisible &&
          !nearFinalCta &&
          !onForm &&
          !dialogOpen,
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

  return <PaidLandingFixedCta visible={visible && !consentOpen} />;
}
