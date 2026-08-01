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
 * Mobile sticky CTA — only after the demonstration has been sufficiently seen.
 * Hides on plans, final CTA, consent open, or forms.
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
      const demo = document.getElementById("demonstracao");
      if (!demo) {
        setVisible(false);
        return;
      }
      const demoRect = demo.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // Appear only after the demo has been scrolled through enough
      const demoSufficientlySeen = demoRect.bottom < vh * 0.55;
      const plansVisible = sectionInView("planos", 48, 0.15);
      const nearFinalCta = sectionInView("comece-final-cta", 48, 0.1);
      const onForm = Boolean(
        document.activeElement &&
          (document.activeElement.tagName === "INPUT" ||
            document.activeElement.tagName === "TEXTAREA" ||
            document.activeElement.tagName === "SELECT"),
      );
      setVisible(
        demoSufficientlySeen && !plansVisible && !nearFinalCta && !onForm,
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
