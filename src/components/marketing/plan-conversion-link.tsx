"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { PlanConversionEventName } from "@/lib/marketing/plan-conversion-events";
import type { PlanKey } from "@/lib/entitlements";

async function recordPlanInterest(input: {
  event: PlanConversionEventName;
  targetPlanKey?: PlanKey;
  origin?: string;
}) {
  try {
    await fetch("/api/account/plan-interest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify(input),
    });
  } catch {
    // Non-blocking — navigation must continue.
  }
}

export function PlanConversionLink({
  href,
  event,
  targetPlanKey,
  origin,
  className,
  children,
}: {
  href: string;
  event: PlanConversionEventName;
  targetPlanKey?: PlanKey;
  origin?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        void recordPlanInterest({ event, targetPlanKey, origin });
      }}
    >
      {children}
    </Link>
  );
}

export function PlanConversionBeacon({
  event,
  origin,
}: {
  event: PlanConversionEventName;
  origin?: string;
}) {
  return (
    <span
      className="sr-only"
      aria-hidden
      ref={(node) => {
        if (!node || node.dataset.fired === "1") return;
        node.dataset.fired = "1";
        void recordPlanInterest({ event, origin });
      }}
    />
  );
}
