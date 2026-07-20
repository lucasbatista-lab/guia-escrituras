"use client";

import { useEffect } from "react";

export function JourneyCatalogBeacon() {
  useEffect(() => {
    void fetch("/api/journeys/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify({ event: "journey_catalog_viewed" }),
    }).catch(() => {
      // Non-blocking.
    });
  }, []);
  return null;
}
