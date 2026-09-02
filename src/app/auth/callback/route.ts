import { NextResponse, type NextRequest } from "next/server";
import { emailConfirmFlashCookieEntry } from "@/lib/auth/email-confirm-flash";
import { completeIntentAfterConfirmation } from "@/lib/signup-intents";
import {
  setSignupIntentCookie,
  signupIntentCookieEntry,
} from "@/lib/signup-intents/continuity-cookie";
import { safeNextPath } from "@/lib/navigation/safe-next-path";
import {
  createRouteHandlerSupabaseClient,
  redirectWithCollectedCookies,
} from "@/lib/supabase/route-handler";
import { createRequestId } from "@/lib/utils";
import { logger } from "@/lib/logging/logger";

/**
 * Legacy/compat callback (PKCE code exchange).
 * New signup confirmation emails should use /auth/confirm with token_hash.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const intentToken = searchParams.get("intent");
  const next = safeNextPath(searchParams.get("next"), "/planos");
  const requestId = createRequestId();

  const ctx = createRouteHandlerSupabaseClient(request);
  if (!ctx) {
    return NextResponse.redirect(new URL("/entrar?error=config", origin));
  }

  const { supabase, getCollectedCookies } = ctx;

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

  const collected = getCollectedCookies();

  if (intentToken) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return redirectWithCollectedCookies(
        new URL("/entrar?error=session", origin),
        collected,
      );
    }

    const result = await completeIntentAfterConfirmation(
      intentToken,
      user.id,
      requestId,
    );

    if (result.ok) {
      await setSignupIntentCookie(intentToken);
      return redirectWithCollectedCookies(
        new URL(result.redirectTo, origin),
        collected,
        [emailConfirmFlashCookieEntry(), signupIntentCookieEntry(intentToken)],
      );
    }

    logger.warn("auth_callback_intent_failed", {
      requestId,
      code: result.code,
      userId: user.id,
    });

    if (result.code === "expired") {
      return redirectWithCollectedCookies(
        new URL("/assinar/continuar?expired=1", origin),
        collected,
      );
    }
    if (result.code === "consent_failed" || result.code === "missing_consent_data") {
      return redirectWithCollectedCookies(
        new URL("/assinar/continuar?error=consent", origin),
        collected,
      );
    }
    return redirectWithCollectedCookies(new URL("/planos", origin), collected);
  }

  return redirectWithCollectedCookies(new URL(next, origin), collected);
}
