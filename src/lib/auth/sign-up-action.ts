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
  type SignUpClientCode,
} from "@/lib/auth/sign-up-errors";
import { logger } from "@/lib/logging/logger";
import {
  associateIntentUserAwaitingConfirmation,
  completeIntentAfterConfirmation,
  createSignupIntentWithToken,
  SignupIntentConfigError,
  validateCheckoutPlan,
  type SignupTrackingParams,
} from "@/lib/signup-intents";
import { setSignupIntentCookie } from "@/lib/signup-intents/continuity-cookie";
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
});

export type SignUpActionResult =
  | {
      ok: true;
      needsEmailConfirmation: boolean;
      redirectTo:
        | "/confira-seu-email"
        | `/confira-seu-email?${string}`
        | `/assinar/continuar?intent=${string}`
        | null;
      requestId: string;
      emailMasked?: string;
      planKey?: string | null;
    }
  | {
      ok: false;
      code: SignUpClientCode;
      message: string;
      requestId: string;
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

function checkEmailPath(emailMasked: string, planKey: string | null): string {
  const params = new URLSearchParams();
  params.set("hint", emailMasked);
  if (planKey) params.set("plan", planKey);
  return `/confira-seu-email?${params.toString()}`;
}

/** Enumeration-safe success: never confirms whether the account already exists. */
function checkEmailSoftSuccess(
  requestId: string,
  email: string,
  planKey: string | null,
): Extract<SignUpActionResult, { ok: true }> {
  const emailMasked = maskEmail(email);
  return {
    ok: true,
    needsEmailConfirmation: true,
    redirectTo: checkEmailPath(
      emailMasked,
      planKey,
    ) as `/confira-seu-email?${string}`,
    requestId,
    emailMasked,
    planKey,
  };
}

export async function signUpAction(input: {
  displayName: string;
  email: string;
  password: string;
  planKey?: string | null;
  termsAccepted?: boolean;
  tracking?: SignupTrackingParams;
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
      const { record, token } = await createSignupIntentWithToken({
        selectedPlanKey: plan.planKey,
        tracking: parsed.data.tracking,
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
    email: parsed.data.email,
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
      emailMasked: maskEmail(parsed.data.email),
      hasIntent: Boolean(intentId),
    });
    // Never reveal account existence to the client.
    if (mapped.code === "email_taken") {
      return checkEmailSoftSuccess(
        requestId,
        parsed.data.email,
        selectedPlanKey,
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
      emailMasked: maskEmail(parsed.data.email),
    });
    // Do not associate intent or set cookie — user is already registered.
    return checkEmailSoftSuccess(
      requestId,
      parsed.data.email,
      selectedPlanKey,
    );
  }

  if (!data.user) {
    logger.error("sign_up_failed", {
      requestId,
      route: "signUpAction",
      code: "unexpected",
      reason: "empty_user",
      emailMasked: maskEmail(parsed.data.email),
      hasIntent: Boolean(intentId),
    });
    return fail("unexpected", requestId);
  }

  const needsEmailConfirmation = !data.session;

  if (intentId && intentToken) {
    await setSignupIntentCookie(intentToken);

    if (needsEmailConfirmation) {
      try {
        await associateIntentUserAwaitingConfirmation(intentId, data.user.id);
      } catch (associateError) {
        logger.error("sign_up_intent_associate_failed", {
          requestId,
          error:
            associateError instanceof Error
              ? associateError.message
              : "unknown",
        });
      }
    } else {
      const completed = await completeIntentAfterConfirmation(
        intentToken,
        data.user.id,
        requestId,
      );
      if (completed.ok) {
        return {
          ok: true,
          needsEmailConfirmation: false,
          redirectTo: `/assinar/continuar?intent=${encodeURIComponent(intentToken)}` as `/assinar/continuar?intent=${string}`,
          requestId,
        };
      }
      logger.warn("sign_up_intent_complete_failed", {
        requestId,
        code: completed.code,
      });
    }
  }

  logger.info("sign_up_ok", {
    requestId,
    route: "signUpAction",
    needsEmailConfirmation,
    hasPlan,
    emailMasked: maskEmail(parsed.data.email),
  });

  if (needsEmailConfirmation) {
    const emailMasked = maskEmail(parsed.data.email);
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
    redirectTo: intentToken
      ? (`/assinar/continuar?intent=${encodeURIComponent(intentToken)}` as const)
      : "/confira-seu-email",
    requestId,
  };
}
