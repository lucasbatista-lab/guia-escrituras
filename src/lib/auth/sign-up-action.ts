"use server";

import { z } from "zod";
import { getEmailRedirectTo } from "@/lib/auth/app-url";
import {
  isSignUpDuplicateSoftFail,
  mapSignUpAuthError,
  maskEmail,
  safeSignUpMessage,
  type SignUpClientCode,
} from "@/lib/auth/sign-up-errors";
import { logger } from "@/lib/logging/logger";
import { createClient } from "@/lib/supabase/server";
import { hasSupabasePublicEnv } from "@/lib/supabase/keys";
import { createRequestId } from "@/lib/utils";

const signUpSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(72),
});

export type SignUpActionResult =
  | {
      ok: true;
      needsEmailConfirmation: boolean;
      redirectTo: "/onboarding" | null;
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

  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path[0];
    if (path === "email") return fail("email_invalid", requestId);
    if (path === "password") return fail("password_weak", requestId);
    return fail("unexpected", requestId);
  }

  let emailRedirectTo: string;
  try {
    emailRedirectTo = getEmailRedirectTo("/onboarding");
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

  logger.info("sign_up_ok", {
    requestId,
    route: "signUpAction",
    needsEmailConfirmation,
    emailMasked: maskEmail(parsed.data.email),
  });

  return {
    ok: true,
    needsEmailConfirmation,
    redirectTo: needsEmailConfirmation ? null : "/onboarding",
    requestId,
  };
}
