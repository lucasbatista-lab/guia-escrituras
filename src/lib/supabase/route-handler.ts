import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
  hasSupabasePublicEnv,
} from "@/lib/supabase/keys";
import { getAuthCookieOptions } from "@/lib/supabase/auth-cookie-options";

export type CollectedRouteCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

export type RouteHandlerSupabaseClient = ReturnType<typeof createServerClient>;

export type RouteHandlerSupabaseContext = {
  supabase: RouteHandlerSupabaseClient;
  getCollectedCookies: () => readonly CollectedRouteCookie[];
};

/**
 * Supabase SSR client for Route Handlers that mutate session cookies and
 * redirect in the same response. Captures every `setAll` call so cookies are
 * copied onto the final NextResponse (Route Handlers do not reliably merge
 * cookies().set() with a separately constructed redirect).
 */
export function createRouteHandlerSupabaseClient(
  request: NextRequest,
): RouteHandlerSupabaseContext | null {
  if (!hasSupabasePublicEnv()) {
    return null;
  }

  const collected = new Map<string, CollectedRouteCookie>();
  const cookieOptions = getAuthCookieOptions();

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
          for (const { name, value, options } of cookiesToSet) {
            collected.set(name, {
              name,
              value,
              options: { ...cookieOptions, ...options },
            });
          }
        },
      },
    },
  );

  return {
    supabase,
    getCollectedCookies: () => [...collected.values()],
  };
}

/** Apply collected Supabase cookies onto any NextResponse without duplication. */
export function applyCollectedCookiesToResponse(
  response: NextResponse,
  cookies: readonly CollectedRouteCookie[],
  extraCookies: readonly CollectedRouteCookie[] = [],
): NextResponse {
  const merged = new Map<string, CollectedRouteCookie>();
  for (const cookie of cookies) {
    merged.set(cookie.name, cookie);
  }
  for (const cookie of extraCookies) {
    merged.set(cookie.name, cookie);
  }
  for (const cookie of merged.values()) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }
  return response;
}

export function redirectWithCollectedCookies(
  url: URL,
  cookies: readonly CollectedRouteCookie[],
  extraCookies: readonly CollectedRouteCookie[] = [],
  status: 302 | 307 = 302,
): NextResponse {
  const response = NextResponse.redirect(url, status);
  return applyCollectedCookiesToResponse(response, cookies, extraCookies);
}

export function toCollectedCookie(
  name: string,
  value: string,
  options: CookieOptions,
): CollectedRouteCookie {
  return { name, value, options };
}
