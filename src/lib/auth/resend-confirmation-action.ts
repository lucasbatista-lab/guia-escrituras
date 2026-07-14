"use server";

import { z } from "zod";
import { getEmailRedirectTo } from "@/lib/auth/app-url";
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

const resendSchema = z.object({
  email: z.string().trim().email().max(320),
});

export type ResendConfirmationResult =
  | { ok: true; requestId: string; message: string }
  | {
      ok: false;
      code: ResendConfirmationClientCode;
      message: string;
      requestId: string;
    };

/**
 * Resend signup confirmation. Always returns success-shaped feedback when the
 * request is well-formed so we do not reveal whether the email exists.
 */
export async function resendConfirmationAction(input: {
  email: string;
}): Promise<ResendConfirmationResult> {
  const requestId = createRequestId();
  const genericOk =
    "Se este e-mail estiver pendente de confirmação, enviamos um novo link.";

  if (!hasSupabasePublicEnv()) {
    logger.error("resend_confirmation_config_missing", {
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

  const parsed = resendSchema.safeParse(input);
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
    emailRedirectTo = getEmailRedirectTo("/onboarding");
  } catch {
    logger.error("resend_confirmation_config_missing", {
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

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo },
  });

  if (error) {
    const mapped = mapResendAuthError(error);
    logger.error("resend_confirmation_failed", {
      requestId,
      code: mapped.code,
      authCode: error.code ?? null,
      authStatus: error.status ?? null,
      authMessage: (error.message ?? "").slice(0, 160),
      emailMasked: maskEmail(parsed.data.email),
    });

    // Rate limit and SMTP issues: honest differentiation.
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

    // Other auth errors: do not reveal account existence.
    logger.warn("resend_confirmation_soft_ok", {
      requestId,
      emailMasked: maskEmail(parsed.data.email),
      mappedCode: mapped.code,
    });
    return { ok: true, requestId, message: genericOk };
  }

  logger.info("resend_confirmation_ok", {
    requestId,
    emailMasked: maskEmail(parsed.data.email),
  });

  return { ok: true, requestId, message: genericOk };
}
