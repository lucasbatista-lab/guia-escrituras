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
 * Mobile sticky CTA after the hero.
 * Hides while consent is open, while #planos is visible, or near the final CTA.
 */
export function PaidLandingMobileCta() {
  const [pastHero, setPastHero] = useState(false);
  const [plansVisible, setPlansVisible] = useState(false);
  const [nearFinalCta, setNearFinalCta] = useState(false);
  const consentOpen = useSyncExternalStore(
    subscribeConsentBanner,
    getConsentBannerOpen,
    getConsentBannerServerSnapshot,
  );

  useEffect(() => {
    const hero = document.getElementById("comece-hero");
    const plans = document.getElementById("planos");
    const finalCta = document.getElementById("comece-final-cta");
    const observers: IntersectionObserver[] = [];

    if (hero) {
      const heroObserver = new IntersectionObserver(
        ([entry]) => {
          setPastHero(!entry?.isIntersecting);
        },
        { threshold: 0.12 },
      );
      heroObserver.observe(hero);
      observers.push(heroObserver);
    } else {
      const frame = requestAnimationFrame(() => setPastHero(true));
      return () => cancelAnimationFrame(frame);
    }

    if (plans) {
      const plansObserver = new IntersectionObserver(
        ([entry]) => {
          setPlansVisible(Boolean(entry?.isIntersecting));
        },
        { threshold: 0.18, rootMargin: "0px 0px -12% 0px" },
      );
      plansObserver.observe(plans);
      observers.push(plansObserver);
    }

    if (finalCta) {
      const finalObserver = new IntersectionObserver(
        ([entry]) => {
          setNearFinalCta(Boolean(entry?.isIntersecting));
        },
        { threshold: 0.2 },
      );
      finalObserver.observe(finalCta);
      observers.push(finalObserver);
    }

    return () => {
      for (const observer of observers) observer.disconnect();
    };
  }, []);

  const visible =
    pastHero && !consentOpen && !plansVisible && !nearFinalCta;

  return <PaidLandingFixedCta visible={visible} />;
}
