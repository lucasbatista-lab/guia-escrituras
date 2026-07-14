import "server-only";

import type Stripe from "stripe";
import { getPlanByKey, type PlanKey } from "@/lib/entitlements";
import {
  getConfiguredStripeMode,
  getStripePriceIdForPlan,
  isStripeWebhookConfigured,
  StripeConfigError,
} from "./config";
import { getStripeClient } from "./client";
import { isStripeResourceMissing } from "./billing-customer";
import type { StripeKeyMode } from "./key-mode";

export type StripePlanReadinessKey = "essencial" | "caminho" | "profundo";

export type StripeReadinessReport = {
  ready: boolean;
  mode: StripeKeyMode;
  webhookConfigured: boolean;
  plans: Record<StripePlanReadinessKey, { ready: boolean }>;
  issues: string[];
};

const CHECKOUT_PLANS: StripePlanReadinessKey[] = [
  "essencial",
  "caminho",
  "profundo",
];

function expectedAmountCents(planKey: StripePlanReadinessKey): number {
  return getPlanByKey(planKey)?.priceMonthlyCents ?? -1;
}

export async function evaluateStripeReadiness(options?: {
  retrievePrice?: (
    priceId: string,
  ) => Promise<Stripe.Price>;
}): Promise<StripeReadinessReport> {
  const issues: string[] = [];
  let mode: StripeKeyMode;

  try {
    mode = getConfiguredStripeMode();
  } catch (error) {
    const message =
      error instanceof StripeConfigError
        ? "secret_key_invalid_or_missing"
        : "secret_key_unavailable";
    return {
      ready: false,
      mode: "test",
      webhookConfigured: isStripeWebhookConfigured(),
      plans: {
        essencial: { ready: false },
        caminho: { ready: false },
        profundo: { ready: false },
      },
      issues: [message],
    };
  }

  const webhookConfigured = isStripeWebhookConfigured();
  if (!webhookConfigured) {
    issues.push("webhook_secret_missing");
  }

  const stripe = getStripeClient();
  const retrieve =
    options?.retrievePrice ??
    ((priceId: string) => stripe.prices.retrieve(priceId));

  const plans: StripeReadinessReport["plans"] = {
    essencial: { ready: false },
    caminho: { ready: false },
    profundo: { ready: false },
  };

  for (const planKey of CHECKOUT_PLANS) {
    let priceId: string;
    try {
      priceId = getStripePriceIdForPlan(planKey as PlanKey);
    } catch {
      issues.push(`${planKey}: price_id_missing`);
      continue;
    }

    try {
      const price = await retrieve(priceId);
      const planIssues = validatePriceAgainstCatalog(planKey, price);
      if (planIssues.length === 0) {
        plans[planKey] = { ready: true };
      } else {
        for (const issue of planIssues) {
          issues.push(`${planKey}: ${issue}`);
        }
      }
    } catch (error) {
      if (isStripeResourceMissing(error)) {
        issues.push(`${planKey}: price_not_found_in_mode`);
      } else {
        issues.push(`${planKey}: price_lookup_failed`);
      }
    }
  }

  const plansReady = CHECKOUT_PLANS.every((k) => plans[k].ready);
  return {
    ready: plansReady && webhookConfigured,
    mode,
    webhookConfigured,
    plans,
    issues,
  };
}

export function validatePriceAgainstCatalog(
  planKey: StripePlanReadinessKey,
  price: Pick<
    Stripe.Price,
    "active" | "currency" | "unit_amount" | "type" | "recurring"
  >,
): string[] {
  const issues: string[] = [];
  if (!price.active) issues.push("price_inactive");
  if ((price.currency || "").toLowerCase() !== "brl") {
    issues.push("currency_not_brl");
  }
  if (price.type !== "recurring" || price.recurring?.interval !== "month") {
    issues.push("not_monthly_recurring");
  }
  const expected = expectedAmountCents(planKey);
  if (price.unit_amount !== expected) {
    issues.push("unit_amount_mismatch");
  }
  return issues;
}
