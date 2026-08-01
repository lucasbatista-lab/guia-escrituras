"use client";

import type { ReactNode } from "react";
import { ConsentBanner } from "./consent-banner";
import { ConsentProvider } from "./consent-context";

export function ConsentRoot({ children }: { children: ReactNode }) {
  return (
    <ConsentProvider>
      {children}
      <ConsentBanner />
    </ConsentProvider>
  );
}
