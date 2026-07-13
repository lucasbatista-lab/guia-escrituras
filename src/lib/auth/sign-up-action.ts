"use server";

import { z } from "zod";
import { getPrivacyVersion, getTermsVersion } from "@/config/legal";
import { getEmailRedirectTo } from "@/lib/auth/app-url";
import {
  isSignUpDuplicateSoftFail,
  mapSignUpAuthError,
  maskEmail,
  safeSignUpMessage,
  type SignUpClientCode,
} from "@/lib/auth/sign-up-errors";
import { logger } from "@/lib/logging/logger";
import {
  completeIntentAfterConfirmation,
  createSignupIntentWithToken,
  getAuthCallbackUrlForIntent,
  markIntentAwaitingConfirmation,
  SignupIntentConfigError,
  validateCheckoutPlan,
  type SignupTrackingParams,
} from "@/lib/signup-intents";
import { createClient } from "@/lib/supabase/server";
import { hasSupabasePublicEnv } from "@/lib/supabase/keys";
import { createRequestId } from "@/lib/utils";

const signUpSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(72),
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
      redirectTo: "/onboarding" | `/assinar/continuar?intent=${string}` | null;
      requestId: string;
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
    return fail("unexpected", requestId);
  }

  const hasPlan = Boolean(parsed.data.planKey?.trim());
  if (hasPlan && !parsed.data.termsAccepted) {
    return fail("terms_required", requestId);
  }

  let intentToken: string | null = null;
  let intentId: string | null = null;

  if (hasPlan) {
    const plan = validateCheckoutPlan(parsed.data.planKey);
    if (!plan.ok) {
      return fail(
        plan.code === "request_access_plan" ? "invalid_plan" : "invalid_plan",
        requestId,
      );
    }

    try {
      const { record, token } = await createSignupIntentWithToken({
        selectedPlanKey: plan.planKey,
        tracking: parsed.data.tracking,
        termsVersion: getTermsVersion(),
        privacyVersion: getPrivacyVersion(),
        termsAcceptedAt: new Date().toISOString(),
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
      ? getAuthCallbackUrlForIntent(intentToken)
      : getEmailRedirectTo("/onboarding");
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
      data: { display_name: parsed.data.displayName },
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
      authMessage: error.message,
      emailMasked: maskEmail(parsed.data.email),
    });
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
      emailMasked: maskEmail(parsed.data.email),
    });
    return fail("email_taken", requestId);
  }

  if (!data.user) {
    logger.error("sign_up_failed", {
      requestId,
      route: "signUpAction",
      code: "unexpected",
      reason: "empty_user",
      emailMasked: maskEmail(parsed.data.email),
    });
    return fail("unexpected", requestId);
  }

  const needsEmailConfirmation = !data.session;

  if (intentId && intentToken) {
    if (needsEmailConfirmation) {
      await markIntentAwaitingConfirmation(intentId);
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
          redirectTo: completed.redirectTo as `/assinar/continuar?intent=${string}`,
          requestId,
        };
      }
    }
  }

  logger.info("sign_up_ok", {
    requestId,
    route: "signUpAction",
    needsEmailConfirmation,
    hasPlan,
    emailMasked: maskEmail(parsed.data.email),
  });

  return {
    ok: true,
    needsEmailConfirmation,
    redirectTo: needsEmailConfirmation
      ? null
      : intentToken
        ? (`/assinar/continuar?intent=${encodeURIComponent(intentToken)}` as const)
        : "/onboarding",
    requestId,
  };
}
