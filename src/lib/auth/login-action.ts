"use server";

import { z } from "zod";
import { resolvePostLoginDestination } from "@/lib/auth/post-login-destination";
import { logger } from "@/lib/logging/logger";
import { createClient } from "@/lib/supabase/server";
import { hasSupabasePublicEnv } from "@/lib/supabase/keys";
import { createRequestId } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(72),
  next: z.string().nullable().optional(),
});

export type LoginActionResult =
  | { ok: true; redirectTo: string; requestId: string }
  | {
      ok: false;
      message: string;
      requestId: string;
      code?: "invalid_credentials" | "email_not_confirmed" | "config_missing";
    };

export async function loginAction(input: {
  email: string;
  password: string;
  next?: string | null;
}): Promise<LoginActionResult> {
  const requestId = createRequestId();

  if (!hasSupabasePublicEnv()) {
    return {
      ok: false,
      message:
        "Autenticação indisponível: configure o Supabase neste ambiente.",
      requestId,
      code: "config_missing",
    };
  }

  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Não foi possível entrar. Verifique e-mail e senha.",
      requestId,
      code: "invalid_credentials",
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      ok: false,
      message:
        "Autenticação indisponível: configure o Supabase neste ambiente.",
      requestId,
      code: "config_missing",
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email.trim().toLowerCase(),
    password: parsed.data.password,
  });

  if (error) {
    const authCode = (error.code ?? "").toLowerCase();
    logger.warn("login_failed", {
      requestId,
      authCode: error.code ?? null,
    });

    if (
      authCode === "email_not_confirmed" ||
      error.message?.toLowerCase().includes("email not confirmed")
    ) {
      return {
        ok: false,
        message:
          "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada ou solicite um novo link de confirmação.",
        requestId,
        code: "email_not_confirmed",
      };
    }

    return {
      ok: false,
      message: "Não foi possível entrar. Verifique e-mail e senha.",
      requestId,
      code: "invalid_credentials",
    };
  }

  const redirectTo = await resolvePostLoginDestination({
    nextParam: parsed.data.next ?? null,
  });

  logger.info("login_ok", { requestId });

  return { ok: true, redirectTo, requestId };
}
