"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useConsentOptional } from "@/components/consent/consent-context";
import {
  createMetaEventId,
  getPublicMetaPixelId,
  isMetaPixelSurface,
} from "@/lib/meta/browser-events";
import {
  disableMetaPixelRuntime,
  trackMetaBrowserEvent,
} from "@/lib/meta/pixel-loader";

/**
 * Consent-gated Meta Pixel for public funnel surfaces only.
 * Never mounts tracking inside Admin, chat, or authenticated product shells
 * beyond the allowlisted continuation pages.
 */
export function MetaPixelGate() {
  const pathname = usePathname() || "/";
  const consent = useConsentOptional();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    const pixelId = getPublicMetaPixelId();
    if (!pixelId) return;
    if (!consent?.ready) return;

    if (!consent.advertisingGranted) {
      disableMetaPixelRuntime();
      return;
    }

    if (!isMetaPixelSurface(pathname)) {
      return;
    }

    if (lastPathRef.current === pathname) {
      return;
    }
    lastPathRef.current = pathname;

    trackMetaBrowserEvent(
      "PageView",
      {},
      {
        eventId: createMetaEventId(),
        dedupeKey: `PageView:${pathname}`,
      },
    );

    if (pathname === "/comece") {
      trackMetaBrowserEvent(
        "ViewContent",
        { content_name: "paid_landing", content_category: "landing" },
        {
          eventId: createMetaEventId(),
          dedupeKey: `ViewContent:/comece`,
        },
      );
    }
  }, [
    consent?.advertisingGranted,
    consent?.ready,
    pathname,
  ]);

  useEffect(() => {
    function onConsentChanged(event: Event) {
      const detail = (event as CustomEvent<{ advertising?: string }>).detail;
      if (detail?.advertising !== "granted") {
        disableMetaPixelRuntime();
        lastPathRef.current = null;
      }
    }
    window.addEventListener("amem:consent-changed", onConsentChanged);
    return () => {
      window.removeEventListener("amem:consent-changed", onConsentChanged);
    };
  }, []);

  return null;
}
