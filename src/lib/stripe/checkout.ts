import "server-only";

import { headers } from "next/headers";
import { getAuthUserContext } from "@/lib/auth/session";
import { assessCheckoutEligibility } from "@/lib/billing/checkout-guard";
import { loadUserSubscriptions } from "@/lib/billing/subscription-lookup";
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
  StripeConfigError,
} from "./config";
import { getStripeClient } from "./client";
import {
  getOrCreateBillingCustomer,
  isStripeResourceMissing,
} from "./billing-customer";
import { preflightCheckoutPlan } from "./checkout-preflight";
import {
  checkoutFailureMessage,
  extractSafeStripeErrorDiagnostics,
  mapStripeCheckoutError,
  shortCheckoutRef,
  type CheckoutFailureCode,
  type CheckoutStage,
} from "./checkout-errors";
import type { AdsCheckoutContext } from "@/lib/meta/ads-checkout-context";
import {
  buildAdsSessionMetadata,
  captureCapiRequestContext,
  emitInitiateCheckoutSafe,
  type CapiServerRequestContext,
} from "@/lib/meta/emit-checkout-conversions";

export type CreateCheckoutResult =
  | { ok: true; url: string; requestId: string }
  | {
      ok: false;
      code: CheckoutFailureCode;
      message: string;
      requestId: string;
      ref: string;
    };

/** Trusted checkout actor — always constructed server-side, never from client input. */
export type CheckoutTrustedActor = {
  userId: string;
  email: string;
  source: "new_signup" | "authenticated_user";
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

function fail(
  requestId: string,
  code: CheckoutFailureCode,
  stage: CheckoutStage,
  extras?: { planKey?: string; mode?: string; issue?: string },
): Extract<CreateCheckoutResult, { ok: false }> {
  logger.error("stripe_checkout_failed", {
    requestId,
    stage,
    mode: extras?.mode,
    planKey: extras?.planKey,
    code,
    issue: extras?.issue,
  });
  return {
    ok: false,
    code,
    message: checkoutFailureMessage(code),
    requestId,
    ref: shortCheckoutRef(requestId),
  };
}

/**
 * Core checkout — accepts a server-derived trusted actor.
 * Never call with userId/email supplied by the client.
 */
export async function createSubscriptionCheckoutForActor(
  actor: CheckoutTrustedActor,
  intentToken: string | null = null,
  adsContext: AdsCheckoutContext | null = null,
  requestId: string = createRequestId(),
): Promise<CreateCheckoutResult> {
  let stage: CheckoutStage = "config";
  let planKey: string | undefined;
  let mode: string | undefined;

  try {
    stage = "config";
    try {
      assertStripeConfigured();
      mode = getConfiguredStripeMode();
    } catch (error) {
      return fail(requestId, "config_missing", "config", {
        mode,
        issue:
          error instanceof StripeConfigError
            ? "secret_key_invalid_or_missing"
            : "config_assert_failed",
      });
    }

    stage = "intent";
    const view = await resolveCheckoutView(actor.userId, intentToken);
    if (view.kind === "expired") {
      return fail(requestId, "expired", "intent");
    }
    if (view.kind === "used") {
      return fail(requestId, "used", "intent");
    }
    if (view.kind === "forbidden") {
      return fail(requestId, "forbidden", "intent");
    }
    if (view.kind !== "ready") {
      return fail(requestId, "invalid_intent", "intent");
    }
    planKey = view.planKey;

    const intent = intentToken
      ? await loadSignupIntentByToken(intentToken)
      : await loadSignupIntentByIdForUser(view.intentId, actor.userId);

    if (!intent || intent.userId !== actor.userId) {
      return fail(requestId, "invalid_intent", "intent", { planKey, mode });
    }

    stage = "subscription_guard";
    const subscriptions = await loadUserSubscriptions(actor.userId, {
      useAdmin: true,
    });
    const eligibility = assessCheckoutEligibility(subscriptions);
    if (!eligibility.eligible) {
      return fail(requestId, "existing_subscription", "subscription_guard", {
        planKey,
        mode,
      });
    }

    stage = "preflight";
    const preflight = await preflightCheckoutPlan(view.planKey);
    if (!preflight.ok) {
      return fail(requestId, preflight.code, "preflight", {
        planKey,
        mode,
        issue: preflight.issue,
      });
    }
    mode = preflight.mode;
    const priceId = preflight.priceId;

    const stripe = getStripeClient();
    const admin = createAdminClient();

    stage = "reuse_session";
    if (intent.stripeCheckoutSessionId && intent.status === "checkout_created") {
      try {
        const existing = await stripe.checkout.sessions.retrieve(
          intent.stripeCheckoutSessionId,
        );
        if (existing.url && existing.status === "open") {
          logger.info("stripe_checkout_reused", {
            requestId,
            stage: "reuse_session",
            mode,
            planKey,
            code: "ok",
          });
          return { ok: true, url: existing.url, requestId };
        }
      } catch (error) {
        // Sandbox session ID with live key (or deleted) — create a new session.
        if (!isStripeResourceMissing(error)) {
          const mapped = mapStripeCheckoutError(error);
          return fail(requestId, mapped.code, "reuse_session", {
            planKey,
            mode,
            issue: mapped.providerCode ?? "reuse_failed",
          });
        }
        logger.info("stripe_checkout_reuse_skipped", {
          requestId,
          stage: "reuse_session",
          mode,
          planKey,
          code: "resource_missing",
        });
      }
    }

    stage = "customer";
    let customerId: string;
    try {
      customerId = await getOrCreateBillingCustomer(actor.userId, actor.email);
    } catch (error) {
      const mapped = mapStripeCheckoutError(error);
      return fail(
        requestId,
        mapped.code === "checkout_failed" ? "customer_failed" : mapped.code,
        "customer",
        {
          planKey,
          mode,
          issue: mapped.providerCode ?? "customer_error",
        },
      );
    }

    stage = "create_session";
    const { successUrl, cancelUrl } = getCheckoutUrls();
    const sharedMetadata = {
      user_id: actor.userId,
      plan_key: view.planKey,
      signup_intent_id: intent.id,
      stripe_mode: mode,
      checkout_source: actor.source,
    };
    // Advertising metadata is session-only (non-financial). Never mutate
    // price/line_items/customer/subscription commercial fields for Meta.
    let capiRequest: CapiServerRequestContext = {
      clientIp: null,
      clientUa: null,
    };
    try {
      const requestHeaders = await headers();
      capiRequest = captureCapiRequestContext(requestHeaders);
    } catch {
      // Outside a Next request (tests/edge) — checkout proceeds without IP/UA.
    }
    const adsMetadata = buildAdsSessionMetadata(adsContext, capiRequest);
    const sessionMetadata = { ...sharedMetadata, ...adsMetadata };

    let session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: "subscription",
        locale: "pt-BR",
        customer: customerId,
        client_reference_id: actor.userId,
        line_items: [{ price: priceId, quantity: 1 }],
        allow_promotion_codes: true,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: sessionMetadata,
        subscription_data: {
          metadata: sharedMetadata,
        },
      });
    } catch (error) {
      // Temporary diagnostics — safe fields only (no IDs/emails/secrets/payload).
      const diagnostics = extractSafeStripeErrorDiagnostics(error);
      logger.error("stripe_checkout_session_create_rejected", {
        requestId,
        stage: "create_session",
        mode,
        planKey,
        stripe_type: diagnostics.stripe_type,
        stripe_raw_type: diagnostics.stripe_raw_type,
        stripe_code: diagnostics.stripe_code,
        stripe_param: diagnostics.stripe_param,
        stripe_status_code: diagnostics.stripe_status_code,
        stripe_request_id: diagnostics.stripe_request_id,
        stripe_request_log_url: diagnostics.stripe_request_log_url,
        stripe_doc_url: diagnostics.stripe_doc_url,
        stripe_message_safe: diagnostics.stripe_message_safe,
      });
      const mapped = mapStripeCheckoutError(error);
      return fail(requestId, mapped.code, "create_session", {
        planKey,
        mode,
        issue: mapped.providerCode ?? "session_create_failed",
      });
    }

    if (!session.url) {
      return fail(requestId, "checkout_failed", "create_session", {
        planKey,
        mode,
        issue: "missing_session_url",
      });
    }

    stage = "persist";
    try {
      await admin
        .from("signup_intents")
        .update({
          status: "checkout_created",
          stripe_checkout_session_id: session.id,
          checkout_created_at: new Date().toISOString(),
        })
        .eq("id", intent.id);
    } catch {
      // Session already exists at Stripe — still redirect user.
      logger.error("stripe_checkout_persist_failed", {
        requestId,
        stage: "persist",
        mode,
        planKey,
        code: "persist_failed",
      });
    }

    logger.info("stripe_checkout_created", {
      requestId,
      stage: "create_session",
      mode,
      planKey,
      code: "ok",
    });

    // Meta InitiateCheckout is additive and must never fail checkout.
    await emitInitiateCheckoutSafe(session, adsContext, {
      userId: actor.userId,
      email: actor.email,
      clientIp: capiRequest.clientIp,
      clientUa: capiRequest.clientUa,
    });

    return { ok: true, url: session.url, requestId };
  } catch (error) {
    const mapped = mapStripeCheckoutError(error);
    return fail(requestId, mapped.code, stage, {
      planKey,
      mode,
      issue: mapped.providerCode ?? "unexpected",
    });
  }
}

/** Authenticated checkout wrapper — requires a valid Supabase session. */
export async function createSubscriptionCheckout(
  intentToken: string | null = null,
  adsContext: AdsCheckoutContext | null = null,
): Promise<CreateCheckoutResult> {
  const requestId = createRequestId();
  const auth = await getAuthUserContext();
  if (!auth || auth.demoMode) {
    return fail(requestId, "unauthenticated", "auth");
  }
  if (!auth.email) {
    return fail(requestId, "unauthenticated", "auth", {
      issue: "missing_email",
    });
  }
  return createSubscriptionCheckoutForActor(
    {
      userId: auth.userId,
      email: auth.email,
      source: "authenticated_user",
    },
    intentToken,
    adsContext,
    requestId,
  );
}
