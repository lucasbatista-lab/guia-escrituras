"use client";

import { useEffect, useState } from "react";
import { PaidLandingFixedCta } from "./paid-landing-scroll-cta";

/**
 * Mobile sticky CTA after the hero. Consent banner visibility is wired in
 * Block B via data-consent-banner-open on <html>.
 */
export function PaidLandingMobileCta() {
  const [pastHero, setPastHero] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("comece-hero");
    if (!hero) {
      setPastHero(true);
      return;
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

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      setConsentOpen(root.getAttribute("data-consent-banner-open") === "true");
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-consent-banner-open"],
    });
    return () => observer.disconnect();
  }, []);

  return <PaidLandingFixedCta visible={pastHero && !consentOpen} />;
}
