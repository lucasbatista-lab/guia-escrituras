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
 * Mobile sticky CTA after the hero.
 * Hides while consent is open, while #planos is visible, or near the final CTA.
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
      const hero = document.getElementById("comece-hero");
      const pastHero = hero
        ? hero.getBoundingClientRect().bottom < window.innerHeight * 0.2
        : true;
      const plansVisible = sectionInView("planos", 48, 0.15);
      const nearFinalCta = sectionInView("comece-final-cta", 48, 0.1);
      setVisible(pastHero && !plansVisible && !nearFinalCta);
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return <PaidLandingFixedCta visible={visible && !consentOpen} />;
}
