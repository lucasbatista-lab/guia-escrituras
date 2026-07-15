"use server";

import { z } from "zod";
import { logger } from "@/lib/logging/logger";
import { createClient } from "@/lib/supabase/server";
import { hasSupabasePublicEnv } from "@/lib/supabase/keys";
import { createRequestId } from "@/lib/utils";

const passwordSchema = z
  .object({
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "mismatch",
    path: ["confirmPassword"],
  })
  .refine((data) => /[A-Za-z]/.test(data.password) && /\d/.test(data.password), {
    message: "weak",
    path: ["password"],
  });

export type UpdatePasswordResult =
  | { ok: true; requestId: string; redirectTo: string }
  | {
      ok: false;
      code:
        | "no_session"
        | "password_weak"
        | "password_mismatch"
        | "config_missing"
        | "unexpected";
      message: string;
      requestId: string;
    };

const MESSAGES = {
  no_session:
    "Este link expirou ou é inválido. Solicite um novo link de recuperação.",
  password_weak:
    "A senha é muito fraca. Use pelo menos 8 caracteres, com letras e números.",
  password_mismatch: "As senhas não coincidem. Digite novamente.",
  config_missing:
    "Não foi possível atualizar a senha agora. Tente novamente em instantes.",
  unexpected: "Não foi possível atualizar a senha. Tente novamente.",
} as const;

/**
 * Set a new password after recovery verifyOtp (or while already signed in).
 * Requires an authenticated session — never accepts token_hash in the form.
 */
export async function updatePasswordAction(input: {
  password: string;
  confirmPassword: string;
}): Promise<UpdatePasswordResult> {
  const requestId = createRequestId();

  if (!hasSupabasePublicEnv()) {
    logger.error("password_update_config_missing", { requestId });
    return {
      ok: false,
      code: "config_missing",
      message: MESSAGES.config_missing,
      requestId,
    };
  }

  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue?.message === "mismatch") {
      return {
        ok: false,
        code: "password_mismatch",
        message: MESSAGES.password_mismatch,
        requestId,
      };
    }
    return {
      ok: false,
      code: "password_weak",
      message: MESSAGES.password_weak,
      requestId,
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      ok: false,
      code: "config_missing",
      message: MESSAGES.config_missing,
      requestId,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.warn("password_update_no_session", { requestId });
    return {
      ok: false,
      code: "no_session",
      message: MESSAGES.no_session,
      requestId,
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    logger.error("password_update_failed", {
      requestId,
      authCode: error.code ?? null,
      authStatus: error.status ?? null,
      authMessage: (error.message ?? "").slice(0, 160),
    });
    if (
      error.code === "weak_password" ||
      (msg.includes("password") && msg.includes("weak"))
    ) {
      return {
        ok: false,
        code: "password_weak",
        message: MESSAGES.password_weak,
        requestId,
      };
    }
    return {
      ok: false,
      code: "unexpected",
      message: MESSAGES.unexpected,
      requestId,
    };
  }

  logger.info("password_update_ok", { requestId });
  return {
    ok: true,
    requestId,
    redirectTo: "/redefinir-senha?ok=1",
  };
}
