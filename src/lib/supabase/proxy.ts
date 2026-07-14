import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { allowsMocks } from "@/config/runtime";
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

const AUTH_PAGES = ["/entrar", "/cadastro", "/recuperar-senha"];

const PLATFORM_PREFIXES = [
  "/inicio",
  "/conversar",
  "/conversas",
  "/jornada",
  "/conta",
  "/onboarding",
  "/personalizar",
  "/assinar",
  "/assinatura",
];

const ADMIN_PREFIXES = ["/admin"];

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
];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isPublicApi(pathname: string): boolean {
  return (
    pathname === "/api/health" ||
    pathname.startsWith("/api/health/")
  );
}

/** Copy refreshed auth cookies onto a redirect so the session is not dropped. */
function redirectPreservingCookies(
  url: URL,
  supabaseResponse: NextResponse,
): NextResponse {
  const redirectResponse = NextResponse.redirect(url);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
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
  return pathname + (request.nextUrl.search || "");
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  const cookieOptions = getAuthCookieOptions();

  if (!hasSupabasePublicEnv()) {
    if (!allowsMocks() && matchesPrefix(pathname, [...PLATFORM_PREFIXES, ...ADMIN_PREFIXES])) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
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

  if (!user && matchesPrefix(pathname, PLATFORM_PREFIXES)) {
    // Preserve Checkout session_id in HttpOnly cookie before login bounce.
    if (
      pathname === "/assinatura/sucesso" ||
      pathname.startsWith("/assinatura/sucesso/")
    ) {
      const sessionId = request.nextUrl.searchParams.get("session_id");
      if (sessionId && isStripeCheckoutSessionId(sessionId)) {
        supabaseResponse.cookies.set("amem_checkout_return", sessionId, {
          ...cookieOptions,
          httpOnly: true,
          maxAge: 60 * 60,
        });
      }
    }

    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = "";
    url.searchParams.set("next", loginNextForRequest(request));
    return redirectPreservingCookies(url, supabaseResponse);
  }

  if (!user && matchesPrefix(pathname, ADMIN_PREFIXES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = "";
    url.searchParams.set("next", pathname);
    return redirectPreservingCookies(url, supabaseResponse);
  }

  const userId = user?.id;

  // Logged-in users leaving auth pages → journey destination (avoid loops)
  if (user && userId && AUTH_PAGES.includes(pathname)) {
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

  void isPublicApi;
  return supabaseResponse;
}
