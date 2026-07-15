import "server-only";

import type { PlanKey } from "@/lib/entitlements";
import {
  getConfiguredStripeMode,
  getStripePriceIdForPlan,
  isStripeWebhookConfigured,
  StripeConfigError,
} from "./config";
import { getStripeClient } from "./client";
import { isStripeResourceMissing } from "./billing-customer";
import {
  validatePriceAgainstCatalog,
  type StripePlanReadinessKey,
} from "./readiness";
import type { CheckoutFailureCode } from "./checkout-errors";
import type { StripeKeyMode } from "./key-mode";

export type CheckoutPreflightOk = {
  ok: true;
  mode: StripeKeyMode;
  priceId: string;
};

export type CheckoutPreflightFail = {
  ok: false;
  code: CheckoutFailureCode;
  issue: string;
};

/**
 * Preflight only the selected plan (not all three catalog prices).
 */
export async function preflightCheckoutPlan(
  planKey: PlanKey,
  deps?: {
    retrievePrice?: (priceId: string) => Promise<{
      active: boolean;
      currency: string;
      unit_amount: number | null;
      type: string;
      recurring: { interval: string } | null;
    }>;
  },
): Promise<CheckoutPreflightOk | CheckoutPreflightFail> {
  if (planKey === "particular") {
    return {
      ok: false,
      code: "price_unavailable",
      issue: "particular_not_checkout",
    };
  }

  let mode: StripeKeyMode;
  try {
    mode = getConfiguredStripeMode();
  } catch (error) {
    return {
      ok: false,
      code: "config_missing",
      issue:
        error instanceof StripeConfigError
          ? "secret_key_invalid_or_missing"
          : "secret_key_unavailable",
    };
  }

  if (!isStripeWebhookConfigured()) {
    return {
      ok: false,
      code: "config_missing",
      issue: "webhook_secret_missing",
    };
  }

  let priceId: string;
  try {
    priceId = getStripePriceIdForPlan(planKey);
  } catch {
    return {
      ok: false,
      code: "price_unavailable",
      issue: "price_id_missing",
    };
  }

  const stripe = getStripeClient();
  const retrieve =
    deps?.retrievePrice ??
    ((id: string) => stripe.prices.retrieve(id) as never);

  try {
    const price = await retrieve(priceId);
    const issues = validatePriceAgainstCatalog(
      planKey as StripePlanReadinessKey,
      price as never,
    );
    if (issues.length > 0) {
      return {
        ok: false,
        code: "price_unavailable",
        issue: issues[0] ?? "price_invalid",
      };
    }
    return { ok: true, mode, priceId };
  } catch (error) {
    if (isStripeResourceMissing(error)) {
      return {
        ok: false,
        code: "price_unavailable",
        issue: "price_not_found_in_mode",
      };
    }
    return {
      ok: false,
      code: "stripe_temporary",
      issue: "price_lookup_failed",
    };
  }
}
