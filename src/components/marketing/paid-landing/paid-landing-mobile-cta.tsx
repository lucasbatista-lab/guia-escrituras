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

/**
 * Mobile sticky CTA after the hero. Hides while the consent banner is open.
 */
export function PaidLandingMobileCta() {
  const [pastHero, setPastHero] = useState(false);
  const consentOpen = useSyncExternalStore(
    subscribeConsentBanner,
    getConsentBannerOpen,
    getConsentBannerServerSnapshot,
  );

  useEffect(() => {
    const hero = document.getElementById("comece-hero");
    if (!hero) {
      const frame = requestAnimationFrame(() => setPastHero(true));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setPastHero(!entry?.isIntersecting);
      },
      { threshold: 0.15 },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return <PaidLandingFixedCta visible={pastHero && !consentOpen} />;
}
