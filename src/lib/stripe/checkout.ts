import "server-only";

import { getAuthUserContext } from "@/lib/auth/session";
import {
  getContinuationViewState,
  loadSignupIntentByToken,
} from "@/lib/signup-intents";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logging/logger";
import { createRequestId } from "@/lib/utils";
import {
  assertStripeConfigured,
  getCheckoutUrls,
  getStripePriceIdForPlan,
  StripeConfigError,
} from "./config";
import { getStripeClient } from "./client";
import { getOrCreateBillingCustomer } from "./persistence";

export type CreateCheckoutResult =
  | { ok: true; url: string }
  | {
      ok: false;
      code:
        | "unauthenticated"
        | "config_missing"
        | "invalid_intent"
        | "forbidden"
        | "expired"
        | "used";
      message: string;
    };

export async function createSubscriptionCheckout(
  intentToken: string,
): Promise<CreateCheckoutResult> {
  const requestId = createRequestId();
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
          : "Pagamento indisponível no momento.",
    };
  }

  const view = await getContinuationViewState(intentToken, auth.userId);
  if (view.kind === "expired") {
    return { ok: false, code: "expired", message: "Este link expirou." };
  }
  if (view.kind === "used") {
    return { ok: false, code: "used", message: "Este fluxo já foi utilizado." };
  }
  if (view.kind === "forbidden") {
    return { ok: false, code: "forbidden", message: "Acesso negado." };
  }
  if (view.kind !== "ready") {
    return {
      ok: false,
      code: "invalid_intent",
      message: "Continuação indisponível.",
    };
  }

  const intent = await loadSignupIntentByToken(intentToken);
  if (!intent) {
    return {
      ok: false,
      code: "invalid_intent",
      message: "Continuação indisponível.",
    };
  }

  const admin = createAdminClient();

  if (intent.stripeCheckoutSessionId && intent.status === "checkout_created") {
    const stripe = getStripeClient();
    const existing = await stripe.checkout.sessions.retrieve(
      intent.stripeCheckoutSessionId,
    );
    if (existing.url && existing.status === "open") {
      return { ok: true, url: existing.url };
    }
  }

  const stripe = getStripeClient();
  const customerId = await getOrCreateBillingCustomer(
    auth.userId,
    auth.email,
    async (input) => {
      const customer = await stripe.customers.create(input);
      return { id: customer.id };
    },
  );

  const priceId = getStripePriceIdForPlan(view.planKey);
  const { successUrl, cancelUrl } = getCheckoutUrls();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      user_id: auth.userId,
      plan_key: view.planKey,
      signup_intent_id: intent.id,
    },
    subscription_data: {
      metadata: {
        user_id: auth.userId,
        plan_key: view.planKey,
        signup_intent_id: intent.id,
      },
    },
  });

  if (!session.url) {
    logger.error("stripe_checkout_no_url", { requestId, userId: auth.userId });
    return {
      ok: false,
      code: "config_missing",
      message: "Não foi possível iniciar o pagamento.",
    };
  }

  await admin
    .from("signup_intents")
    .update({
      status: "checkout_created",
      stripe_checkout_session_id: session.id,
      checkout_created_at: new Date().toISOString(),
    })
    .eq("id", intent.id);

  logger.info("stripe_checkout_created", {
    requestId,
    userId: auth.userId,
    planKey: view.planKey,
    intentId: intent.id,
  });

  return { ok: true, url: session.url };
}
