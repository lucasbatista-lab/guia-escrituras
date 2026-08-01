"use client";

import { useEffect, useRef } from "react";
import { trackPublicConversion } from "@/lib/acquisition/public-events-client";
import type { PublicConversionEventName } from "@/lib/acquisition/public-event-types";

/**
 * Fires a first-party public conversion once when the section enters view.
 * Never sends content, theme, or PII to Meta.
 */
export function PaidLandingSectionView({
  event,
  targetId,
}: {
  event: Extract<
    PublicConversionEventName,
    "paid_landing_demo_viewed" | "paid_landing_plans_viewed"
  >;
  targetId: string;
}) {
  const fired = useRef(false);

  useEffect(() => {
    const node = document.getElementById(targetId);
    if (!node || fired.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || fired.current) return;
        fired.current = true;
        trackPublicConversion(event);
        observer.disconnect();
      },
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [event, targetId]);

  return null;
}
