import "server-only";

import { getAuthUserContext } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  assertStripeConfigured,
  getPortalReturnUrl,
  StripeConfigError,
} from "./config";
import { getStripeClient } from "./client";

export async function createCustomerPortalSession(): Promise<
  | { ok: true; url: string }
  | {
      ok: false;
      code: "unauthenticated" | "no_customer" | "config_missing";
      message: string;
    }
> {
  const auth = await getAuthUserContext();
  if (!auth || auth.demoMode) {
    return {
      ok: false,
      code: "unauthenticated",
      message: "Faça login para continuar.",
    };
  }

  try {
    assertStripeConfigured();
  } catch (error) {
    return {
      ok: false,
      code: "config_missing",
      message:
        error instanceof StripeConfigError
          ? error.message
          : "Portal indisponível.",
    };
  }

  const admin = createAdminClient();
  const { data: billing } = await admin
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (!billing?.stripe_customer_id) {
    return {
      ok: false,
      code: "no_customer",
      message: "Nenhuma assinatura de cobrança encontrada para esta conta.",
    };
  }

  const stripe = getStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: billing.stripe_customer_id,
    return_url: getPortalReturnUrl(),
  });

  return { ok: true, url: session.url };
}
