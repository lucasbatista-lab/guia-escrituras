import "server-only";

import type { PlanKey } from "@/lib/entitlements";
import { getStripePriceIdForPlan } from "./config";

export type WebhookBindingCode =
  | "customer_missing"
  | "customer_unmapped"
  | "user_mismatch"
  | "plan_unresolved"
  | "plan_mismatch";

/** Permanent mismatches must not grant entitlement; ACK after failed mark. */
export const PERMANENT_WEBHOOK_BINDING_CODES = new Set<WebhookBindingCode>([
  "user_mismatch",
  "plan_mismatch",
  "plan_unresolved",
]);

export class WebhookBindingError extends Error {
  readonly code: WebhookBindingCode;
  readonly retryable: boolean;

  constructor(code: WebhookBindingCode) {
    super(code);
    this.name = "WebhookBindingError";
    this.code = code;
    this.retryable = !PERMANENT_WEBHOOK_BINDING_CODES.has(code);
  }
}

export function extractStripeCustomerId(
  customer: unknown,
): string | null {
  if (typeof customer === "string" && customer.startsWith("cus_")) {
    return customer;
  }
  if (
    customer &&
    typeof customer === "object" &&
    "id" in customer &&
    typeof (customer as { id: unknown }).id === "string"
  ) {
    const id = (customer as { id: string }).id;
    return id.startsWith("cus_") ? id : null;
  }
  return null;
}

export function extractStripePriceId(price: unknown): string | null {
  if (typeof price === "string" && price.startsWith("price_")) {
    return price;
  }
  if (
    price &&
    typeof price === "object" &&
    "id" in price &&
    typeof (price as { id: unknown }).id === "string"
  ) {
    const id = (price as { id: string }).id;
    return id.startsWith("price_") ? id : null;
  }
  return null;
}

export function planKeyFromMetadata(
  metadata: Record<string, string> | null | undefined,
): PlanKey | null {
  const key = metadata?.plan_key?.trim();
  if (
    key === "essencial" ||
    key === "caminho" ||
    key === "profundo" ||
    key === "particular"
  ) {
    return key;
  }
  return null;
}

/** Map a Stripe Price id to an internal checkout plan via env catalog only. */
export function planKeyFromConfiguredPriceId(
  priceId: string,
): Exclude<PlanKey, "particular"> | null {
  const keys = ["essencial", "caminho", "profundo"] as const;
  for (const key of keys) {
    try {
      if (getStripePriceIdForPlan(key) === priceId) return key;
    } catch {
      // env missing for this plan — skip
    }
  }
  return null;
}

export function resolvePlanKeyFromPriceAndMetadata(input: {
  priceId: string | null;
  metadataPlanKey: PlanKey | null;
}): Exclude<PlanKey, "particular"> {
  const fromPrice = input.priceId
    ? planKeyFromConfiguredPriceId(input.priceId)
    : null;

  if (fromPrice && input.metadataPlanKey && fromPrice !== input.metadataPlanKey) {
    throw new WebhookBindingError("plan_mismatch");
  }
  if (fromPrice) return fromPrice;
  // Metadata alone is not enough — need a configured Price for safe resolution.
  throw new WebhookBindingError("plan_unresolved");
}

/**
 * Authority for ownership is billing_customers.
 * metadata.user_id, when present, must match the mapped user.
 */
export async function resolveUserIdForStripeCustomer(input: {
  customerId: string | null;
  metadataUserId?: string | null;
  lookupUserIdByCustomerId: (
    customerId: string,
  ) => Promise<string | null>;
}): Promise<string> {
  if (!input.customerId) {
    throw new WebhookBindingError("customer_missing");
  }

  const mappedUserId = await input.lookupUserIdByCustomerId(input.customerId);
  if (!mappedUserId) {
    throw new WebhookBindingError("customer_unmapped");
  }

  const meta = input.metadataUserId?.trim() || null;
  if (meta && meta !== mappedUserId) {
    throw new WebhookBindingError("user_mismatch");
  }

  return mappedUserId;
}
