"use client";

import { useEffect, useRef } from "react";
import type { PlanKey } from "@/lib/entitlements";
import type { PublicConversionEventName } from "@/lib/acquisition/public-event-types";
import { trackPublicConversion } from "@/lib/acquisition/public-events-client";

export function PublicConversionBeacon({
  event,
  plan = null,
  observe = false,
}: {
  event: PublicConversionEventName;
  plan?: PlanKey | null;
  observe?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!observe || !node) {
      trackPublicConversion(event, plan);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        trackPublicConversion(event, plan);
        observer.disconnect();
      },
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [event, observe, plan]);

  return <span ref={ref} className="sr-only" aria-hidden />;
}
