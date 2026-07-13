import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { completeIntentAfterConfirmation } from "@/lib/signup-intents";
import { createRequestId } from "@/lib/utils";
import { logger } from "@/lib/logging/logger";

function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/onboarding";
  }
  return next;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const intentToken = searchParams.get("intent");
  const next = safeNextPath(searchParams.get("next"));
  const requestId = createRequestId();

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.redirect(new URL("/entrar?error=config", origin));
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      logger.error("auth_callback_exchange_failed", {
        requestId,
        authMessage: error.message,
      });
      return NextResponse.redirect(new URL("/entrar?error=confirm", origin));
    }
  }

  if (intentToken) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/entrar?error=session", origin));
    }

    const result = await completeIntentAfterConfirmation(
      intentToken,
      user.id,
      requestId,
    );

    if (result.ok) {
      return NextResponse.redirect(new URL(result.redirectTo, origin));
    }

    logger.warn("auth_callback_intent_failed", {
      requestId,
      code: result.code,
      userId: user.id,
    });

    if (result.code === "expired") {
      return NextResponse.redirect(new URL("/assinar/continuar?expired=1", origin));
    }
    if (result.code === "consent_failed" || result.code === "missing_consent_data") {
      return NextResponse.redirect(
        new URL("/assinar/continuar?error=consent", origin),
      );
    }
    return NextResponse.redirect(new URL("/planos", origin));
  }

  return NextResponse.redirect(new URL(next, origin));
}
