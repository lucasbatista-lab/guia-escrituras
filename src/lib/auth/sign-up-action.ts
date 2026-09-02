"use server";

import { z } from "zod";
import { getPrivacyVersion, getTermsVersion } from "@/config/legal";
import {
  getEmailRedirectTo,
  getEmailRedirectToWithIntent,
} from "@/lib/auth/app-url";
import {
  isSignUpDuplicateSoftFail,
  mapSignUpAuthError,
  maskEmail,
  safeSignUpMessage,
  ACCOUNT_EXISTS_ACTIONABLE_MESSAGE,
  type SignUpClientCode,
} from "@/lib/auth/sign-up-errors";
import { logger } from "@/lib/logging/logger";
import type { AdsCheckoutContext } from "@/lib/meta/ads-checkout-context";
import {
  completeIntentAfterConfirmation,
  createSignupIntentWithToken,
  SignupIntentConfigError,
  validateCheckoutPlan,
  type SignupTrackingParams,
} from "@/lib/signup-intents";
import { setSignupIntentCookie } from "@/lib/signup-intents/continuity-cookie";
import { resolveTrackingForSignupIntent } from "@/lib/acquisition";
import { createSubscriptionCheckoutForActor } from "@/lib/stripe/checkout";
import { checkoutFailureMessage } from "@/lib/stripe/checkout-errors";
import { createClient } from "@/lib/supabase/server";
import { hasSupabasePublicEnv } from "@/lib/supabase/keys";
import { createRequestId } from "@/lib/utils";

const signUpSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(320),
  password: z
    .string()
    .min(8)
    .max(72)
    .regex(/[A-Za-z]/, "letters")
    .regex(/[0-9]/, "numbers"),
  planKey: z.string().trim().optional().nullable(),
  termsAccepted: z.boolean(),
  tracking: z
    .object({
      referralCode: z.string().nullable().optional(),
      utmSource: z.string().nullable().optional(),
      utmMedium: z.string().nullable().optional(),
      utmCampaign: z.string().nullable().optional(),
      utmContent: z.string().nullable().optional(),
      utmTerm: z.string().nullable().optional(),
    })
    .optional(),
  adsContext: z
    .object({
      advertisingConsent: z.boolean(),
      eventSourceUrl: z.string().nullable().optional(),
      fbp: z.string().nullable().optional(),
      fbc: z.string().nullable().optional(),
      eventId: z.string().nullable().optional(),
    })
    .optional()
    .nullable(),
});

export type SignUpActionResult =
  | {
      ok: true;
      needsEmailConfirmation: boolean;
      stripeCheckout?: boolean;
      redirectTo:
        | "/confira-seu-email"
        | `/confira-seu-email?${string}`
        | `/assinar/continuar?intent=${string}`
        | `https://${string}`
        | `http://${string}`
        | null;
      requestId: string;
      emailMasked?: string;
      planKey?: string | null;
    }
  | {
      ok: false;
      code: SignUpClientCode | "account_exists_actionable" | "checkout_failed";
      message: string;
      requestId: string;
      showLoginCtas?: boolean;
      checkoutRef?: string;
    };

function fail(
  code: SignUpClientCode,
  requestId: string,
): SignUpActionResult {
  return {
    ok: false,
    code,
    message: safeSignUpMessage(code),
    requestId,
  };
}

function checkEmailPath(
  emailMasked: string,
  planKey: string | null,
  intentToken?: string | null,
): string {
  const params = new URLSearchParams();
  params.set("hint", emailMasked);
  if (planKey) params.set("plan", planKey);
  if (intentToken) params.set("intent", intentToken);
  return `/confira-seu-email?${params.toString()}`;
}

/** Enumeration-safe success for organic signup without plan. */
function checkEmailSoftSuccess(
  requestId: string,
  email: string,
  planKey: string | null,
  intentToken?: string | null,
): Extract<SignUpActionResult, { ok: true }> {
  const emailMasked = maskEmail(email);
  return {
    ok: true,
    needsEmailConfirmation: true,
    redirectTo: checkEmailPath(
      emailMasked,
      planKey,
      intentToken,
    ) as `/confira-seu-email?${string}`,
    requestId,
    emailMasked,
    planKey,
  };
}

function accountExistsActionable(requestId: string): SignUpActionResult {
  return {
    ok: false,
    code: "account_exists_actionable",
    message: ACCOUNT_EXISTS_ACTIONABLE_MESSAGE,
    requestId,
    showLoginCtas: true,
  };
}

async function attemptPaidCheckout(params: {
  userId: string;
  email: string;
  intentToken: string;
  adsContext: AdsCheckoutContext | null | undefined;
  requestId: string;
  needsEmailConfirmation: boolean;
  planKey: string;
}): Promise<SignUpActionResult> {
  const completed = await completeIntentAfterConfirmation(
    params.intentToken,
    params.userId,
    params.requestId,
  );
  if (!completed.ok) {
    logger.warn("sign_up_intent_complete_failed", {
      requestId: params.requestId,
      code: completed.code,
    });
    return {
      ok: false,
      code: "checkout_failed",
      message:
        "Não foi possível preparar o pagamento agora. Tente novamente em instantes.",
      requestId: params.requestId,
    };
  }

  const checkout = await createSubscriptionCheckoutForActor(
    {
      userId: params.userId,
      email: params.email,
      source: "new_signup",
    },
    params.intentToken,
    params.adsContext ?? null,
    params.requestId,
  );

  if (!checkout.ok) {
    logger.error("sign_up_checkout_failed", {
      requestId: params.requestId,
      code: checkout.code,
      ref: checkout.ref,
    });
    return {
      ok: false,
      code: "checkout_failed",
      message: checkoutFailureMessage(checkout.code),
      requestId: params.requestId,
      checkoutRef: checkout.ref,
    };
  }

  logger.info("sign_up_checkout_redirect", {
    requestId: params.requestId,
    needsEmailConfirmation: params.needsEmailConfirmation,
    planKey: params.planKey,
  });

  return {
    ok: true,
    needsEmailConfirmation: params.needsEmailConfirmation,
    stripeCheckout: true,
    redirectTo: checkout.url as `https://${string}`,
    requestId: params.requestId,
    emailMasked: maskEmail(params.email),
    planKey: params.planKey,
  };
}

async function tryExistingAccountCheckout(params: {
  email: string;
  password: string;
  intentToken: string;
  intentId: string;
  adsContext: AdsCheckoutContext | null | undefined;
  requestId: string;
  planKey: string;
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>;
}): Promise<SignUpActionResult> {
  const { data, error } = await params.supabase.auth.signInWithPassword({
    email: params.email,
    password: params.password,
  });

  if (error || !data.user) {
    logger.warn("sign_up_existing_login_failed", {
      requestId: params.requestId,
      authCode: error?.code ?? null,
    });
    return accountExistsActionable(params.requestId);
  }

  await setSignupIntentCookie(params.intentToken);

  return attemptPaidCheckout({
    userId: data.user.id,
    email: params.email,
    intentToken: params.intentToken,
    adsContext: params.adsContext,
    requestId: params.requestId,
    needsEmailConfirmation: !data.session,
    planKey: params.planKey,
  });
}

export async function signUpAction(input: {
  displayName: string;
  email: string;
  password: string;
  planKey?: string | null;
  termsAccepted?: boolean;
  tracking?: SignupTrackingParams;
  adsContext?: AdsCheckoutContext | null;
}): Promise<SignUpActionResult> {
  const requestId = createRequestId();

  if (!hasSupabasePublicEnv()) {
    logger.error("sign_up_config_missing", {
      requestId,
      route: "signUpAction",
      reason: "supabase_public_env",
    });
    return fail("config_missing", requestId);
  }

  const parsed = signUpSchema.safeParse({
    ...input,
    termsAccepted: input.termsAccepted ?? false,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path[0];
    if (path === "email") return fail("email_invalid", requestId);
    if (path === "password") return fail("password_weak", requestId);
    if (path === "termsAccepted") return fail("terms_required", requestId);
    logger.warn("sign_up_validation_failed", {
      requestId,
      path: typeof path === "string" ? path : "unknown",
    });
    return fail("unexpected", requestId);
  }

  if (!parsed.data.termsAccepted) {
    return fail("terms_required", requestId);
  }

  const hasPlan = Boolean(parsed.data.planKey?.trim());
  const termsVersion = getTermsVersion();
  const privacyVersion = getPrivacyVersion();
  const termsAcceptedAt = new Date().toISOString();
  const normalizedEmail = parsed.data.email.trim().toLowerCase();

  let intentToken: string | null = null;
  let intentId: string | null = null;
  let selectedPlanKey: string | null = null;

  if (hasPlan) {
    const plan = validateCheckoutPlan(parsed.data.planKey);
    if (!plan.ok) {
      return fail("invalid_plan", requestId);
    }
    selectedPlanKey = plan.planKey;

    try {
      const tracking = await resolveTrackingForSignupIntent(
        parsed.data.tracking,
      );
      const { record, token } = await createSignupIntentWithToken({
        selectedPlanKey: plan.planKey,
        tracking,
        termsVersion,
        privacyVersion,
        termsAcceptedAt,
      });
      intentToken = token;
      intentId = record.id;
    } catch (error) {
      if (error instanceof SignupIntentConfigError) {
        logger.error("sign_up_config_missing", {
          requestId,
          route: "signUpAction",
          reason: "secret_key",
        });
        return fail("config_missing", requestId);
      }
      logger.error("sign_up_intent_failed", {
        requestId,
        error: error instanceof Error ? error.message : "unknown",
      });
      return fail("unexpected", requestId);
    }
  }

  let emailRedirectTo: string;
  try {
    emailRedirectTo = intentToken
      ? getEmailRedirectToWithIntent(intentToken, "/email-confirmado")
      : getEmailRedirectTo("/planos");
  } catch {
    logger.error("sign_up_config_missing", {
      requestId,
      route: "signUpAction",
      reason: "app_url",
    });
    return fail("config_missing", requestId);
  }

  const supabase = await createClient();
  if (!supabase) {
    logger.error("sign_up_config_missing", {
      requestId,
      route: "signUpAction",
      reason: "supabase_client",
    });
    return fail("config_missing", requestId);
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password: parsed.data.password,
    options: {
      data: {
        display_name: parsed.data.displayName,
        terms_version: termsVersion,
        privacy_version: privacyVersion,
        terms_accepted_at: termsAcceptedAt,
      },
      emailRedirectTo,
    },
  });

  if (error) {
    const mapped = mapSignUpAuthError(error);
    logger.error("sign_up_failed", {
      requestId,
      route: "signUpAction",
      code: mapped.code,
      authCode: error.code ?? null,
      authStatus: error.status ?? null,
      authMessage: (error.message ?? "").slice(0, 160),
      emailMasked: maskEmail(normalizedEmail),
      hasIntent: Boolean(intentId),
    });

    if (mapped.code === "email_taken" && intentToken && intentId && selectedPlanKey) {
      return tryExistingAccountCheckout({
        email: normalizedEmail,
        password: parsed.data.password,
        intentToken,
        intentId,
        adsContext: parsed.data.adsContext as AdsCheckoutContext | null | undefined,
        requestId,
        planKey: selectedPlanKey,
        supabase,
      });
    }

    if (mapped.code === "email_taken") {
      return checkEmailSoftSuccess(
        requestId,
        normalizedEmail,
        selectedPlanKey,
        intentToken,
      );
    }
    return {
      ok: false,
      code: mapped.code,
      message: mapped.message,
      requestId,
    };
  }

  if (
    isSignUpDuplicateSoftFail({
      user: data.user,
      session: data.session,
    })
  ) {
    logger.warn("sign_up_duplicate_soft", {
      requestId,
      route: "signUpAction",
      code: "email_taken",
      emailMasked: maskEmail(normalizedEmail),
    });

    if (intentToken && intentId && selectedPlanKey) {
      return tryExistingAccountCheckout({
        email: normalizedEmail,
        password: parsed.data.password,
        intentToken,
        intentId,
        adsContext: parsed.data.adsContext as AdsCheckoutContext | null | undefined,
        requestId,
        planKey: selectedPlanKey,
        supabase,
      });
    }

    return checkEmailSoftSuccess(
      requestId,
      normalizedEmail,
      selectedPlanKey,
      intentToken,
    );
  }

  if (!data.user) {
    logger.error("sign_up_failed", {
      requestId,
      route: "signUpAction",
      code: "unexpected",
      reason: "empty_user",
      emailMasked: maskEmail(normalizedEmail),
      hasIntent: Boolean(intentId),
    });
    return fail("unexpected", requestId);
  }

  const needsEmailConfirmation = !data.session;
  const userEmail = data.user.email?.trim().toLowerCase() || normalizedEmail;

  if (intentId && intentToken && selectedPlanKey) {
    await setSignupIntentCookie(intentToken);

    return attemptPaidCheckout({
      userId: data.user.id,
      email: userEmail,
      intentToken,
      adsContext: parsed.data.adsContext as AdsCheckoutContext | null | undefined,
      requestId,
      needsEmailConfirmation,
      planKey: selectedPlanKey,
    });
  }

  logger.info("sign_up_ok", {
    requestId,
    route: "signUpAction",
    needsEmailConfirmation,
    hasPlan,
    emailMasked: maskEmail(normalizedEmail),
  });

  if (needsEmailConfirmation) {
    const emailMasked = maskEmail(normalizedEmail);
    return {
      ok: true,
      needsEmailConfirmation: true,
      redirectTo: checkEmailPath(
        emailMasked,
        selectedPlanKey,
      ) as `/confira-seu-email?${string}`,
      requestId,
      emailMasked,
      planKey: selectedPlanKey,
    };
  }

  return {
    ok: true,
    needsEmailConfirmation: false,
    redirectTo: "/confira-seu-email",
    requestId,
  };
}
