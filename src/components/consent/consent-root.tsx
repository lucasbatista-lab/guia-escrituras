"use client";

import type { ReactNode } from "react";
import { MetaPixelGate } from "@/components/meta/meta-pixel-gate";
import { ConsentBanner } from "./consent-banner";
import { ConsentProvider } from "./consent-context";

export function ConsentRoot({ children }: { children: ReactNode }) {
  return (
    <ConsentProvider>
      {children}
      <ConsentBanner />
      <MetaPixelGate />
    </ConsentProvider>
  );
}
