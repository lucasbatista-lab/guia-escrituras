import "server-only";

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

export type CreateCheckoutResult =
  | { ok: true; url: string; requestId: string }
  | {
      ok: false;
      code: CheckoutFailureCode;
      message: string;
      requestId: string;
      ref: string;
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

export async function createSubscriptionCheckout(
  intentToken: string | null = null,
): Promise<CreateCheckoutResult> {
  const requestId = createRequestId();
  let stage: CheckoutStage = "auth";
  let planKey: string | undefined;
  let mode: string | undefined;

  try {
    const auth = await getAuthUserContext();
    if (!auth || auth.demoMode) {
      return fail(requestId, "unauthenticated", "auth");
    }

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
    const view = await resolveCheckoutView(auth.userId, intentToken);
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
      : await loadSignupIntentByIdForUser(view.intentId, auth.userId);

    if (!intent || intent.userId !== auth.userId) {
      return fail(requestId, "invalid_intent", "intent", { planKey, mode });
    }

    stage = "subscription_guard";
    const subscriptions = await loadUserSubscriptions(auth.userId, {
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
      customerId = await getOrCreateBillingCustomer(auth.userId, auth.email);
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
      user_id: auth.userId,
      plan_key: view.planKey,
      signup_intent_id: intent.id,
      stripe_mode: mode,
    };

    let session;
    try {
      session = await stripe.checkout.sessions.create({
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
