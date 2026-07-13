import "server-only";

import type { PlanKey } from "@/lib/entitlements";

export class StripeConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeConfigError";
  }
}

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
  if (!getStripeSecretKey()) {
    throw new StripeConfigError(
      "Pagamento indisponível: configure STRIPE_SECRET_KEY no servidor.",
    );
  }
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

export function getCheckoutUrls(): { successUrl: string; cancelUrl: string } {
  const origin =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "";
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
  const origin =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "";
  if (!origin) throw new StripeConfigError("APP_URL ausente.");
  return `${origin.replace(/\/$/, "")}/conta`;
}
