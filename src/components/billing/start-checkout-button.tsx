"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { startCheckoutAction } from "@/lib/billing/checkout-action";
import { collectAdsCheckoutContext } from "@/lib/meta/collect-ads-checkout-context";

export function StartCheckoutButton({
  intentToken,
  label,
  retryLabel,
  isRetry = false,
}: {
  intentToken: string | null;
  label: string;
  retryLabel: string;
  isRetry?: boolean;
}) {
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      size="lg"
      className="min-h-12 w-full bg-ink text-base hover:bg-ink/90"
      disabled={pending}
      aria-busy={pending}
      onClick={() => {
        setPending(true);
        const adsContext = collectAdsCheckoutContext();
        void startCheckoutAction(intentToken, adsContext).finally(() => {
          // Redirect throws / navigates away; reset if the action returns.
          setPending(false);
        });
      }}
    >
      {pending ? "Redirecionando…" : isRetry ? retryLabel : label}
    </Button>
  );
}
