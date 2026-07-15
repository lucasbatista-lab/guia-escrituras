"use server";

import { z } from "zod";
import { getPasswordRecoveryRedirectTo } from "@/lib/auth/app-url";
import {
  mapResendAuthError,
  maskEmail,
  safeResendMessage,
  type ResendConfirmationClientCode,
} from "@/lib/auth/sign-up-errors";
import { logger } from "@/lib/logging/logger";
import { createClient } from "@/lib/supabase/server";
import { hasSupabasePublicEnv } from "@/lib/supabase/keys";
import { createRequestId } from "@/lib/utils";

const resetSchema = z.object({
  email: z.string().trim().email().max(320),
});

export type PasswordResetRequestResult =
  | {
      ok: true;
      requestId: string;
      message: string;
      emailHint: string;
      redirectTo: string;
    }
  | {
      ok: false;
      code: ResendConfirmationClientCode;
      message: string;
      requestId: string;
    };

const GENERIC_OK =
  "Se o e-mail existir, enviamos um link para redefinir a senha.";

/**
 * Request password recovery email. Never reveals whether the account exists.
 * RedirectTo uses /auth/confirm + next=/redefinir-senha (token_hash SSR).
 */
export async function requestPasswordResetAction(input: {
  email: string;
}): Promise<PasswordResetRequestResult> {
  const requestId = createRequestId();

  if (!hasSupabasePublicEnv()) {
    logger.error("password_reset_config_missing", {
      requestId,
      reason: "supabase_public_env",
    });
    return {
      ok: false,
      code: "config_missing",
      message: safeResendMessage("config_missing"),
      requestId,
    };
  }

  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "email_invalid",
      message: safeResendMessage("email_invalid"),
      requestId,
    };
  }

  let emailRedirectTo: string;
  try {
    emailRedirectTo = getPasswordRecoveryRedirectTo();
  } catch {
    logger.error("password_reset_config_missing", {
      requestId,
      reason: "app_url",
    });
    return {
      ok: false,
      code: "config_missing",
      message: safeResendMessage("config_missing"),
      requestId,
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      ok: false,
      code: "config_missing",
      message: safeResendMessage("config_missing"),
      requestId,
    };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: emailRedirectTo,
  });

  if (error) {
    const mapped = mapResendAuthError(error);
    logger.error("password_reset_request_failed", {
      requestId,
      code: mapped.code,
      authCode: error.code ?? null,
      authStatus: error.status ?? null,
      authMessage: (error.message ?? "").slice(0, 160),
      emailMasked: maskEmail(parsed.data.email),
    });

    if (
      mapped.code === "email_rate_limit" ||
      mapped.code === "email_service_unavailable" ||
      mapped.code === "config_missing"
    ) {
      return {
        ok: false,
        code: mapped.code,
        message: mapped.message,
        requestId,
      };
    }

    // Soft-ok for most auth errors — do not enumerate accounts.
    logger.warn("password_reset_soft_ok", {
      requestId,
      emailMasked: maskEmail(parsed.data.email),
      mappedCode: mapped.code,
    });
  } else {
    logger.info("password_reset_request_ok", {
      requestId,
      emailMasked: maskEmail(parsed.data.email),
    });
  }

  const emailHint = maskEmail(parsed.data.email);
  const params = new URLSearchParams({
    mode: "recovery",
    hint: emailHint,
  });

  return {
    ok: true,
    requestId,
    message: GENERIC_OK,
    emailHint,
    redirectTo: `/confira-seu-email?${params.toString()}`,
  };
}
