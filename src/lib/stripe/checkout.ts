import "server-only";

import { getAuthUserContext } from "@/lib/auth/session";
import {
  getContinuationViewState,
  getContinuationViewStateForUser,
  loadSignupIntentByIdForUser,
  loadSignupIntentByToken,
  type ContinuationViewState,
} from "@/lib/signup-intents";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logging/logger";
import { createRequestId } from "@/lib/utils";
import {
  assertStripeConfigured,
  getCheckoutUrls,
  getConfiguredStripeMode,
  getStripePriceIdForPlan,
  StripeConfigError,
} from "./config";
import { getStripeClient } from "./client";
import { getOrCreateBillingCustomer } from "./billing-customer";

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

async function resolveCheckoutView(
  authUserId: string,
  intentToken: string | null,
): Promise<ContinuationViewState> {
  if (intentToken) {
    return getContinuationViewState(intentToken, authUserId);
  }
  return getContinuationViewStateForUser(authUserId);
}

export async function createSubscriptionCheckout(
  intentToken: string | null = null,
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

  const view = await resolveCheckoutView(auth.userId, intentToken);
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

  const intent = intentToken
    ? await loadSignupIntentByToken(intentToken)
    : await loadSignupIntentByIdForUser(view.intentId, auth.userId);

  if (!intent || intent.userId !== auth.userId) {
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
  );

  const priceId = getStripePriceIdForPlan(view.planKey);
  const { successUrl, cancelUrl } = getCheckoutUrls();
  const stripeMode = getConfiguredStripeMode();

  const sharedMetadata = {
    user_id: auth.userId,
    plan_key: view.planKey,
    signup_intent_id: intent.id,
    stripe_mode: stripeMode,
  };

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    locale: "pt-BR",
    customer: customerId,
    client_reference_id: auth.userId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: sharedMetadata,
    subscription_data: {
      metadata: sharedMetadata,
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
