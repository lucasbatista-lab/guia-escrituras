import "server-only";

import type { PlanKey } from "@/lib/entitlements";
import { getAppUrl, getCanonicalSiteUrl } from "@/lib/auth/app-url";
import {
  InvalidStripeKeyError,
  resolveStripeKeyMode,
  type StripeKeyMode,
} from "./key-mode";

export class StripeConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeConfigError";
  }
}

export { resolveStripeKeyMode };
export type { StripeKeyMode };

const PRICE_ENV: Record<Exclude<PlanKey, "particular">, string> = {
  essencial: "STRIPE_PRICE_ESSENCIAL",
  caminho: "STRIPE_PRICE_CAMINHO",
  profundo: "STRIPE_PRICE_PROFUNDO",
};

export function getStripeSecretKey(): string {
  return process.env.STRIPE_SECRET_KEY?.trim() || "";
}

export function getStripeWebhookSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || "";
}

export function assertStripeConfigured(): void {
  const key = getStripeSecretKey();
  if (!key) {
    throw new StripeConfigError(
      "Pagamento indisponível: configure STRIPE_SECRET_KEY no servidor.",
    );
  }
  try {
    resolveStripeKeyMode(key);
  } catch (error) {
    if (error instanceof InvalidStripeKeyError) {
      throw new StripeConfigError(error.message);
    }
    throw error;
  }
}

/** Configured Stripe mode from secret key (does not force live in Vercel production). */
export function getConfiguredStripeMode(): StripeKeyMode {
  assertStripeConfigured();
  return resolveStripeKeyMode(getStripeSecretKey());
}

export function isStripeWebhookConfigured(): boolean {
  return Boolean(getStripeWebhookSecret());
}

export function getStripePriceEnvName(
  planKey: Exclude<PlanKey, "particular">,
): string {
  return PRICE_ENV[planKey];
}

export function getStripePriceIdForPlan(planKey: PlanKey): string {
  if (planKey === "particular") {
    throw new StripeConfigError("O plano Particular não usa checkout automático.");
  }
  const envName = PRICE_ENV[planKey];
  const priceId = process.env[envName]?.trim();
  if (!priceId) {
    throw new StripeConfigError(
      `Pagamento indisponível: configure ${envName} no servidor.`,
    );
  }
  return priceId;
}

/**
 * Checkout return URLs always use the configured canonical host
 * (apex https://amemchat.com.br in production), never a stray www/vercel host.
 */
export function getCheckoutUrls(): { successUrl: string; cancelUrl: string } {
  const origin = getAppUrl() || getCanonicalSiteUrl();
  if (!origin) {
    throw new StripeConfigError("APP_URL ou NEXT_PUBLIC_APP_URL ausente.");
  }
  const base = origin.replace(/\/$/, "");
  return {
    successUrl: `${base}/assinatura/sucesso?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${base}/assinatura/cancelada`,
  };
}

export function getPortalReturnUrl(): string {
  const origin = getAppUrl() || getCanonicalSiteUrl();
  if (!origin) throw new StripeConfigError("APP_URL ausente.");
  return `${origin.replace(/\/$/, "")}/conta`;
}
