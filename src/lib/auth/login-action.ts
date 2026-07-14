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
  | { ok: false; message: string; requestId: string };

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
    };
  }

  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Não foi possível entrar. Verifique e-mail e senha.",
      requestId,
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      ok: false,
      message:
        "Autenticação indisponível: configure o Supabase neste ambiente.",
      requestId,
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    logger.warn("login_failed", {
      requestId,
      authCode: error.code ?? null,
    });
    return {
      ok: false,
      message: "Não foi possível entrar. Verifique e-mail e senha.",
      requestId,
    };
  }

  const redirectTo = await resolvePostLoginDestination({
    nextParam: parsed.data.next ?? null,
  });

  logger.info("login_ok", { requestId });

  return { ok: true, redirectTo, requestId };
}
