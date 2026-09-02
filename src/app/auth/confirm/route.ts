import { NextResponse, type NextRequest } from "next/server";
import { emailConfirmFlashCookieEntry } from "@/lib/auth/email-confirm-flash";
import {
  completeIntentAfterConfirmation,
  loadSignupIntentByToken,
} from "@/lib/signup-intents";
import {
  clearSignupIntentCookie,
  signupIntentCookieEntry,
} from "@/lib/signup-intents/continuity-cookie";
import { safeNextPath } from "@/lib/navigation/safe-next-path";
import {
  createRouteHandlerSupabaseClient,
  redirectWithCollectedCookies,
  type CollectedRouteCookie,
} from "@/lib/supabase/route-handler";
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
  return value.length >= 16 && value.length <= 128 && /^[A-Za-z0-9_-]+$/.test(value);
}

function isOtpExpired(error: { message?: string; code?: string | null }): boolean {
  const msg = (error.message ?? "").toLowerCase();
  return (
    msg.includes("expired") ||
    msg.includes("otp_expired") ||
    error.code === "otp_expired"
  );
}

function isOtpAlreadyUsed(error: { message?: string; code?: string | null }): boolean {
  const msg = (error.message ?? "").toLowerCase();
  const code = (error.code ?? "").toLowerCase();
  return (
    msg.includes("already") ||
    msg.includes("already been used") ||
    msg.includes("invalid grant") ||
    code === "otp_disabled"
  );
}

function confirmErrorRedirect(
  origin: string,
  code: "token" | "expired" | "session" | "type" | "already",
  type: string | null,
  requestId: string,
  reason: string,
): NextResponse {
  logger.warn("auth_confirm_failed", {
    requestId,
    outcome: "error",
    reason,
    type,
  });
  const params = new URLSearchParams({ error: code });
  const path = type === "recovery" ? "/recuperar-senha" : "/entrar";
  return NextResponse.redirect(new URL(`${path}?${params.toString()}`, origin));
}

function buildEmailConfirmadoPath(intentToken: string | null): string {
  if (!intentToken) return "/email-confirmado";
  return `/email-confirmado?intent=${encodeURIComponent(intentToken)}`;
}

function finishSignupConfirmRedirect(
  origin: string,
  path: string,
  collectedCookies: readonly CollectedRouteCookie[],
  options: {
    requestId: string;
    sessionAvailable: boolean;
    intentPresent: boolean;
    intentToken: string | null;
    extraCookies?: CollectedRouteCookie[];
  },
): NextResponse {
  const extras: CollectedRouteCookie[] = [
    emailConfirmFlashCookieEntry(),
    ...(options.extraCookies ?? []),
  ];

  if (options.intentToken) {
    extras.push(signupIntentCookieEntry(options.intentToken));
  }

  const cookiesAttached = collectedCookies.length + extras.length;

  logger.info("auth_confirm_redirect", {
    requestId: options.requestId,
    redirect_path: path.split("?")[0],
    intent_present: options.intentPresent,
  });
  logger.info(
    options.sessionAvailable
      ? "auth_confirm_session_available"
      : "auth_confirm_session_missing",
    {
      requestId: options.requestId,
      session_available: options.sessionAvailable,
    },
  );
  logger.info("auth_confirm_cookies_attached", {
    requestId: options.requestId,
    cookies_attached: cookiesAttached,
  });

  return redirectWithCollectedCookies(new URL(path, origin), collectedCookies, extras);
}

export async function GET(request: NextRequest) {
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
    logger.warn("auth_confirm_failed", {
      requestId,
      outcome: "error",
      reason: "invalid_intent_shape",
    });
    return NextResponse.redirect(new URL("/planos", origin));
  }

  if (!tokenHash || tokenHash.length < 16) {
    logger.warn("auth_confirm_failed", {
      requestId,
      outcome: "error",
      reason: "missing_token_hash",
    });
    return confirmErrorRedirect(origin, "token", typeRaw, requestId, "missing_token_hash");
  }

  if (!typeRaw || !ALLOWED_OTP_TYPES.has(typeRaw)) {
    logger.warn("auth_confirm_failed", {
      requestId,
      outcome: "error",
      reason: "invalid_type",
      type: typeRaw,
    });
    return confirmErrorRedirect(origin, "type", typeRaw, requestId, "invalid_type");
  }

  const type = typeRaw as
    | "email"
    | "signup"
    | "invite"
    | "magiclink"
    | "recovery"
    | "email_change";

  const ctx = createRouteHandlerSupabaseClient(request);
  if (!ctx) {
    const path =
      type === "recovery" ? "/recuperar-senha?error=config" : "/entrar?error=config";
    logger.warn("auth_confirm_failed", {
      requestId,
      outcome: "error",
      reason: "config_missing",
      type,
    });
    return NextResponse.redirect(new URL(path, origin));
  }

  const { supabase, getCollectedCookies } = ctx;

  const { error: otpError } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (otpError) {
    const expired = isOtpExpired(otpError);
    const already = isOtpAlreadyUsed(otpError);
    logger.warn("auth_confirm_verify_failed", {
      requestId,
      authCode: otpError.code ?? null,
      expired,
      already,
      type,
    });

    const {
      data: { user: maybeUser },
    } = await supabase.auth.getUser();

    if (maybeUser && type !== "recovery") {
      const collected = getCollectedCookies();
      const dest = buildEmailConfirmadoPath(intentToken);
      return finishSignupConfirmRedirect(origin, dest, collected, {
        requestId,
        sessionAvailable: true,
        intentPresent: Boolean(intentToken),
        intentToken,
      });
    }

    if (already) {
      return confirmErrorRedirect(origin, "already", type, requestId, "otp_already_used");
    }
    return confirmErrorRedirect(
      origin,
      expired ? "expired" : "token",
      type,
      requestId,
      expired ? "otp_expired" : "otp_invalid",
    );
  }

  logger.info("auth_confirm_verified", {
    requestId,
    outcome: "success",
    type,
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const sessionAvailable = Boolean(user);
  const collected = getCollectedCookies();

  if (type === "recovery") {
    if (!sessionAvailable) {
      return confirmErrorRedirect(origin, "session", type, requestId, "recovery_no_session");
    }
    logger.info("auth_confirm_redirect", {
      requestId,
      redirect_path: "/redefinir-senha",
      intent_present: false,
    });
    logger.info("auth_confirm_cookies_attached", {
      requestId,
      cookies_attached: collected.length,
    });
    return redirectWithCollectedCookies(
      new URL("/redefinir-senha", origin),
      collected,
    );
  }

  if (!sessionAvailable) {
    logger.info("auth_confirm_session_missing", {
      requestId,
      session_available: false,
    });
  } else {
    logger.info("auth_confirm_session_available", {
      requestId,
      session_available: true,
    });
  }

  if (intentToken) {
    const existing = await loadSignupIntentByToken(intentToken).catch(() => null);
    if (existing?.status === "expired") {
      await clearSignupIntentCookie();
      return redirectWithCollectedCookies(
        new URL("/assinar/continuar?expired=1", origin),
        collected,
        [emailConfirmFlashCookieEntry()],
      );
    }

    if (!user) {
      return finishSignupConfirmRedirect(
        origin,
        buildEmailConfirmadoPath(intentToken),
        collected,
        {
          requestId,
          sessionAvailable: false,
          intentPresent: true,
          intentToken,
        },
      );
    }

    const result = await completeIntentAfterConfirmation(
      intentToken,
      user.id,
      requestId,
    );

    if (result.ok) {
      logger.info("auth_confirm_intent_completed", {
        requestId,
        outcome: "success",
        intent_present: true,
      });
      const dest = result.redirectTo.includes("intent=")
        ? result.redirectTo
        : buildEmailConfirmadoPath(intentToken);
      return finishSignupConfirmRedirect(origin, dest, collected, {
        requestId,
        sessionAvailable,
        intentPresent: true,
        intentToken,
      });
    }

    logger.warn("auth_confirm_failed", {
      requestId,
      outcome: "intent_error",
      reason: result.code,
    });

    if (result.code === "expired") {
      await clearSignupIntentCookie();
      return redirectWithCollectedCookies(
        new URL("/assinar/continuar?expired=1", origin),
        collected,
        [emailConfirmFlashCookieEntry()],
      );
    }
    if (result.code === "wrong_user") {
      return redirectWithCollectedCookies(new URL("/planos", origin), collected);
    }
    if (result.code === "consent_failed" || result.code === "missing_consent_data") {
      return redirectWithCollectedCookies(
        new URL("/assinar/continuar?error=consent", origin),
        collected,
        [emailConfirmFlashCookieEntry()],
      );
    }
    if (result.code === "invalid_status") {
      return finishSignupConfirmRedirect(
        origin,
        buildEmailConfirmadoPath(intentToken),
        collected,
        {
          requestId,
          sessionAvailable,
          intentPresent: true,
          intentToken,
        },
      );
    }
  }

  const destination = next.startsWith("/email-confirmado")
    ? next
    : intentToken
      ? buildEmailConfirmadoPath(intentToken)
      : next;

  return finishSignupConfirmRedirect(origin, destination, collected, {
    requestId,
    sessionAvailable,
    intentPresent: Boolean(intentToken),
    intentToken,
  });
}
