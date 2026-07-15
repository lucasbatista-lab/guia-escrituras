"use server";

import { redirect } from "next/navigation";
import { createSubscriptionCheckout } from "@/lib/stripe/checkout";
import {
  checkoutFailureMessage,
  shortCheckoutRef,
} from "@/lib/stripe/checkout-errors";
import { createRequestId } from "@/lib/utils";
import { logger } from "@/lib/logging/logger";

function isNextRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest: unknown }).digest === "string" &&
    String((error as { digest: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

function redirectCheckoutError(
  code: string,
  intentToken: string | null,
  ref: string,
): never {
  const params = new URLSearchParams({
    checkout_error: code,
    ref,
  });
  if (intentToken) params.set("intent", intentToken);
  redirect(`/assinar/continuar?${params.toString()}`);
}

/**
 * Start Stripe Checkout. Never allows Stripe exceptions to surface as RSC 500.
 */
export async function startCheckoutAction(intentToken: string | null = null) {
  try {
    const result = await createSubscriptionCheckout(intentToken);
    if (!result.ok) {
      redirectCheckoutError(result.code, intentToken, result.ref);
    }
    redirect(result.url);
  } catch (error) {
    if (isNextRedirectError(error)) throw error;

    const requestId = createRequestId();
    const ref = shortCheckoutRef(requestId);
    logger.error("stripe_checkout_action_unhandled", {
      requestId,
      stage: "action",
      code: "checkout_failed",
    });
    redirectCheckoutError(
      "checkout_failed",
      intentToken,
      ref,
    );
    // Unreachable — keep typechecker happy if redirect types change.
    void checkoutFailureMessage;
  }
}
