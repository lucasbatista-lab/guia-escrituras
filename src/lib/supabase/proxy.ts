import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { allowsMocks } from "@/config/runtime";
import {
  isApiPath,
  matchesPathPrefix,
  PRIVATE_ADMIN_PREFIXES,
  PRIVATE_PLATFORM_PREFIXES,
} from "@/lib/edge/private-paths";
import { hasLikelySupabaseSessionCookie } from "@/lib/edge/session-cookie";
import { safeNextPath } from "@/lib/navigation/safe-next-path";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
  hasSupabasePublicEnv,
} from "@/lib/supabase/keys";
import { getAuthCookieOptions } from "@/lib/supabase/auth-cookie-options";
import {
  getRequiredDestinationForState,
  resolveUserJourneyStateFromSnapshot,
  type JourneySnapshot,
  type UserJourneyState,
} from "@/lib/journey/journey-state";
import { isStripeCheckoutSessionId } from "@/lib/billing/stripe-session-id";

/** Auth entry pages that bounce signed-in users to the journey (not recovery). */
const AUTH_BOUNCE_PAGES = ["/entrar", "/cadastro"];
/** Signed-in-only auth surfaces that must keep the recovery session. */
const RECOVERY_SESSION_PAGES = ["/redefinir-senha"];

const PLATFORM_PREFIXES = [...PRIVATE_PLATFORM_PREFIXES];
const ADMIN_PREFIXES = [...PRIVATE_ADMIN_PREFIXES];

/** Routes that must not be bounce-redirected into chat paywall loops. */
const PAYWALL_SAFE_PREFIXES = [
  "/planos",
  "/assinar",
  "/conta",
  "/assinatura",
  "/personalizar",
  "/onboarding",
  "/confira-seu-email",
  "/email-confirmado",
  "/redefinir-senha",
  "/recuperar-senha",
];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return matchesPathPrefix(pathname, prefixes);
}

/** Copy refreshed auth cookies onto a redirect so the session is not dropped. */
function redirectPreservingCookies(
  url: URL,
  supabaseResponse: NextResponse,
  status: 307 | 308 = 307,
): NextResponse {
  const redirectResponse = NextResponse.redirect(url, status);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}

function redirectAnonymousToLogin(
  request: NextRequest,
  supabaseResponse: NextResponse,
  nextPath: string,
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/entrar";
  url.search = "";
  url.searchParams.set("next", safeNextPath(nextPath, "/inicio"));
  return redirectPreservingCookies(url, supabaseResponse, 307);
}

function maybePreserveCheckoutReturnCookie(
  request: NextRequest,
  supabaseResponse: NextResponse,
  cookieOptions: ReturnType<typeof getAuthCookieOptions>,
): void {
  const pathname = request.nextUrl.pathname;
  if (
    pathname !== "/assinatura/sucesso" &&
    !pathname.startsWith("/assinatura/sucesso/")
  ) {
    return;
  }
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (sessionId && isStripeCheckoutSessionId(sessionId)) {
    supabaseResponse.cookies.set("amem_checkout_return", sessionId, {
      ...cookieOptions,
      httpOnly: true,
      maxAge: 60 * 60,
    });
  }
}

async function loadJourneySnapshotForUser(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<JourneySnapshot> {
  const [{ data: spiritual }, { data: subs }, { data: intents }] =
    await Promise.all([
      supabase
        .from("spiritual_profiles")
        .select("onboarding_completed")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", userId),
      supabase
        .from("signup_intents")
        .select("status")
        .eq("user_id", userId)
        .in("status", [
          "ready_for_checkout",
          "awaiting_confirmation",
          "checkout_created",
          "pending_signup",
        ])
        .gt("expires_at", new Date().toISOString())
        .order("updated_at", { ascending: false })
        .limit(5),
    ]);

  let liveStatus: string | null = null;
  let hasPastDue = false;
  let hasEnded = false;
  for (const row of subs ?? []) {
    const status = row.status as string;
    if (status === "active" || status === "trialing") liveStatus = status;
    else if (status === "past_due") hasPastDue = true;
    else if (
      status === "canceled" ||
      status === "unpaid" ||
      status === "incomplete"
    ) {
      hasEnded = true;
    }
  }

  const intentRows = (intents ?? []) as Array<{ status: string }>;
  const checkoutCreated = intentRows.find(
    (r) => r.status === "checkout_created",
  );
  const ready = intentRows.find((r) => r.status === "ready_for_checkout");
  const awaiting = intentRows.find((r) => r.status === "awaiting_confirmation");
  const pending = intentRows.find((r) => r.status === "pending_signup");
  const signupIntentStatus = (checkoutCreated?.status ??
    ready?.status ??
    awaiting?.status ??
    pending?.status ??
    null) as JourneySnapshot["signupIntentStatus"];

  return {
    authenticated: true,
    emailConfirmed: true,
    liveSubscriptionStatus: liveStatus,
    onboardingCompleted: Boolean(spiritual?.onboarding_completed),
    cancelAtPeriodEnd: false,
    signupIntentStatus,
    hasPastDueSubscription: hasPastDue,
    hasEndedSubscription: hasEnded,
  };
}

function unpaidDestination(snapshot: JourneySnapshot): string {
  const state = resolveUserJourneyStateFromSnapshot(snapshot);
  if (
    state === "payment_pending" ||
    state === "payment_processing" ||
    state === "confirmed_without_plan" ||
    state === "ended" ||
    state === "past_due"
  ) {
    return getRequiredDestinationForState(state);
  }
  if (snapshot.signupIntentStatus === "checkout_created") {
    return "/assinatura/sucesso";
  }
  if (
    snapshot.signupIntentStatus === "ready_for_checkout" ||
    snapshot.signupIntentStatus === "awaiting_confirmation"
  ) {
    return "/assinar/continuar";
  }
  return "/planos";
}

function loginNextForRequest(request: NextRequest): string {
  const pathname = request.nextUrl.pathname;
  // Prefer a stable resume path without putting Stripe ids in the login URL.
  if (
    pathname === "/assinatura/sucesso" ||
    pathname.startsWith("/assinatura/sucesso/")
  ) {
    return "/assinatura/sucesso";
  }
  return safeNextPath(pathname + (request.nextUrl.search || ""), pathname);
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  const cookieOptions = getAuthCookieOptions();

  // APIs never receive HTML login redirects from this layer.
  const apiRequest = isApiPath(pathname);

  if (!hasSupabasePublicEnv()) {
    if (
      !apiRequest &&
      !allowsMocks() &&
      matchesPrefix(pathname, [...PLATFORM_PREFIXES, ...ADMIN_PREFIXES])
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url, 307);
    }
    return supabaseResponse;
  }

  // Fast anonymous HTML gate: hard HTTP 307 before Supabase round-trip when
  // no auth cookies exist. Layouts/handlers remain the authoritative check.
  if (
    !apiRequest &&
    !hasLikelySupabaseSessionCookie(request) &&
    matchesPrefix(pathname, [...PLATFORM_PREFIXES, ...ADMIN_PREFIXES])
  ) {
    maybePreserveCheckoutReturnCookie(request, supabaseResponse, cookieOptions);
    const nextPath = matchesPrefix(pathname, ADMIN_PREFIXES)
      ? safeNextPath(pathname, "/admin")
      : loginNextForRequest(request);
    return redirectAnonymousToLogin(request, supabaseResponse, nextPath);
  }

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookieOptions,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...cookieOptions,
              ...options,
            }),
          );
        },
      },
    },
  );

  // Prefer getUser so refresh tokens are applied after long checkout redirects.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!apiRequest && !user && matchesPrefix(pathname, PLATFORM_PREFIXES)) {
    maybePreserveCheckoutReturnCookie(request, supabaseResponse, cookieOptions);
    return redirectAnonymousToLogin(
      request,
      supabaseResponse,
      loginNextForRequest(request),
    );
  }

  if (!apiRequest && !user && matchesPrefix(pathname, ADMIN_PREFIXES)) {
    return redirectAnonymousToLogin(
      request,
      supabaseResponse,
      safeNextPath(pathname, "/admin"),
    );
  }

  if (!apiRequest && !user && RECOVERY_SESSION_PAGES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/recuperar-senha";
    url.search = "";
    url.searchParams.set("error", "session");
    return redirectPreservingCookies(url, supabaseResponse, 307);
  }

  const userId = user?.id;

  // Logged-in users leaving login/signup → journey destination (avoid loops).
  // Keep /recuperar-senha and /redefinir-senha so password recovery works.
  if (user && userId && AUTH_BOUNCE_PAGES.includes(pathname)) {
    const nextParam = request.nextUrl.searchParams.get("next");
    if (
      nextParam &&
      (nextParam === "/assinatura/sucesso" ||
        nextParam.startsWith("/assinatura/sucesso?"))
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/assinatura/sucesso";
      url.search = "";
      return redirectPreservingCookies(url, supabaseResponse);
    }

    const snapshot = await loadJourneySnapshotForUser(supabase, userId);
    const state = resolveUserJourneyStateFromSnapshot(snapshot);
    const dest = getRequiredDestinationForState(state);
    const url = request.nextUrl.clone();
    url.pathname = dest;
    url.search = "";
    return redirectPreservingCookies(url, supabaseResponse);
  }

  if (user && userId) {
    const needsGate =
      pathname === "/conversar" ||
      pathname.startsWith("/conversar/") ||
      pathname === "/conversas" ||
      pathname.startsWith("/conversas/") ||
      pathname === "/personalizar" ||
      pathname.startsWith("/personalizar/") ||
      pathname === "/onboarding" ||
      pathname.startsWith("/onboarding/");

    if (needsGate && !matchesPrefix(pathname, ["/planos"])) {
      const snapshot = await loadJourneySnapshotForUser(supabase, userId);
      const state: UserJourneyState =
        resolveUserJourneyStateFromSnapshot(snapshot);
      const isLive = Boolean(
        snapshot.liveSubscriptionStatus === "active" ||
          snapshot.liveSubscriptionStatus === "trialing",
      );

      if (
        pathname === "/onboarding" ||
        pathname.startsWith("/onboarding/")
      ) {
        const url = request.nextUrl.clone();
        url.pathname = "/personalizar";
        return redirectPreservingCookies(url, supabaseResponse);
      }

      if (
        pathname === "/personalizar" ||
        pathname.startsWith("/personalizar/")
      ) {
        if (!isLive) {
          const url = request.nextUrl.clone();
          const dest = unpaidDestination(snapshot);
          url.pathname = dest.split("?")[0] ?? dest;
          url.search = dest.includes("?")
            ? `?${dest.split("?")[1]}`
            : "";
          return redirectPreservingCookies(url, supabaseResponse);
        }
        return supabaseResponse;
      }

      if (
        pathname === "/conversar" ||
        pathname.startsWith("/conversar/") ||
        pathname === "/conversas" ||
        pathname.startsWith("/conversas/")
      ) {
        if (!isLive) {
          if (matchesPrefix(pathname, PAYWALL_SAFE_PREFIXES)) {
            return supabaseResponse;
          }
          const url = request.nextUrl.clone();
          const dest = unpaidDestination(snapshot);
          url.pathname = dest.split("?")[0] ?? "/planos";
          url.search = "";
          return redirectPreservingCookies(url, supabaseResponse);
        }
        if (!snapshot.onboardingCompleted) {
          const url = request.nextUrl.clone();
          url.pathname = "/personalizar";
          url.search = "";
          return redirectPreservingCookies(url, supabaseResponse);
        }
        void state;
      }
    }
  }

  return supabaseResponse;
}
