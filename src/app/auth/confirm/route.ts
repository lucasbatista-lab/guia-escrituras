import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  completeIntentAfterConfirmation,
  loadSignupIntentByToken,
} from "@/lib/signup-intents";
import {
  clearSignupIntentCookie,
  setSignupIntentCookie,
} from "@/lib/signup-intents/continuity-cookie";
import { safeNextPath } from "@/lib/navigation/safe-next-path";
import { createRequestId } from "@/lib/utils";
import { logger } from "@/lib/logging/logger";

const ALLOWED_OTP_TYPES = new Set([
  "email",
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
]);

function isOpaqueIntentToken(value: string | null): value is string {
  if (!value) return false;
  // base64url opaque token — length/shape guard only; never log the value.
  return value.length >= 16 && value.length <= 128 && /^[A-Za-z0-9_-]+$/.test(value);
}

function confirmErrorRedirect(
  origin: string,
  code: "token" | "expired" | "session" | "type" | "already",
): NextResponse {
  const params = new URLSearchParams({ error: code });
  return NextResponse.redirect(new URL(`/entrar?${params.toString()}`, origin));
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const typeRaw = searchParams.get("type");
  const intentToken = searchParams.get("intent");
  const next = safeNextPath(
    searchParams.get("next"),
    intentToken ? "/email-confirmado" : "/planos",
  );
  const requestId = createRequestId();

  if (intentToken && !isOpaqueIntentToken(intentToken)) {
    logger.warn("auth_confirm_invalid_intent_shape", { requestId });
    return NextResponse.redirect(new URL("/planos", origin));
  }

  if (!tokenHash || tokenHash.length < 16) {
    logger.warn("auth_confirm_missing_token_hash", { requestId });
    return confirmErrorRedirect(origin, "token");
  }

  if (!typeRaw || !ALLOWED_OTP_TYPES.has(typeRaw)) {
    logger.warn("auth_confirm_invalid_type", { requestId });
    return confirmErrorRedirect(origin, "type");
  }

  const type = typeRaw as
    | "email"
    | "signup"
    | "invite"
    | "magiclink"
    | "recovery"
    | "email_change";

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.redirect(new URL("/entrar?error=config", origin));
  }

  const { error: otpError } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (otpError) {
    const msg = (otpError.message ?? "").toLowerCase();
    const expired =
      msg.includes("expired") ||
      msg.includes("otp_expired") ||
      otpError.code === "otp_expired";
    logger.warn("auth_confirm_verify_failed", {
      requestId,
      authCode: otpError.code ?? null,
      expired,
    });

    // Already confirmed / used token: try continuing if session exists.
    const {
      data: { user: maybeUser },
    } = await supabase.auth.getUser();
    if (!maybeUser) {
      return confirmErrorRedirect(origin, expired ? "expired" : "token");
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return confirmErrorRedirect(origin, "session");
  }

  if (intentToken) {
    const existing = await loadSignupIntentByToken(intentToken).catch(() => null);
    if (existing?.status === "expired") {
      await clearSignupIntentCookie();
      return NextResponse.redirect(new URL("/assinar/continuar?expired=1", origin));
    }

    const result = await completeIntentAfterConfirmation(
      intentToken,
      user.id,
      requestId,
    );

    if (result.ok) {
      await setSignupIntentCookie(intentToken);
      const dest = result.redirectTo.includes("intent=")
        ? result.redirectTo
        : `/email-confirmado?intent=${encodeURIComponent(intentToken)}`;
      return NextResponse.redirect(new URL(dest, origin));
    }

    logger.warn("auth_confirm_intent_failed", {
      requestId,
      code: result.code,
      userId: user.id,
    });

    if (result.code === "expired") {
      await clearSignupIntentCookie();
      return NextResponse.redirect(new URL("/assinar/continuar?expired=1", origin));
    }
    if (result.code === "wrong_user") {
      return NextResponse.redirect(new URL("/planos", origin));
    }
    if (result.code === "consent_failed" || result.code === "missing_consent_data") {
      return NextResponse.redirect(
        new URL("/assinar/continuar?error=consent", origin),
      );
    }
    // Invalid status / used: fall through to safe next (often already confirmed).
    if (result.code === "invalid_status") {
      return NextResponse.redirect(new URL("/email-confirmado", origin));
    }
  }

  const destination = next.startsWith("/email-confirmado")
    ? next
    : intentToken
      ? `/email-confirmado?intent=${encodeURIComponent(intentToken)}`
      : next;

  return NextResponse.redirect(new URL(destination, origin));
}
