"use client";

import { useEffect, useRef } from "react";

export function PlanComparisonViewBeacon({ origin = "planos" }: { origin?: string }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void fetch("/api/account/plan-interest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify({ event: "plan_comparison_viewed", origin }),
    });
  }, [origin]);
  return null;
}
