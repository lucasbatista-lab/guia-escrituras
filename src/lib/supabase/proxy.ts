import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { allowsMocks } from "@/config/runtime";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
  hasSupabasePublicEnv,
} from "@/lib/supabase/keys";

const AUTH_PAGES = ["/entrar", "/cadastro", "/recuperar-senha"];

const PLATFORM_PREFIXES = [
  "/inicio",
  "/conversar",
  "/conversas",
  "/jornada",
  "/conta",
  "/onboarding",
  "/assinar",
  "/assinatura",
];

const ADMIN_PREFIXES = ["/admin"];

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

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

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
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (!user && matchesPrefix(pathname, PLATFORM_PREFIXES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (!user && matchesPrefix(pathname, ADMIN_PREFIXES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Logged-in users leaving auth pages → platform (avoid loops with onboarding)
  if (user && AUTH_PAGES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/inicio";
    return NextResponse.redirect(url);
  }

  // Onboarding gate for chat routes (not for onboarding itself or conta)
  if (
    user &&
    (pathname === "/conversar" || pathname.startsWith("/conversar/"))
  ) {
    const { data: spiritual } = await supabase
      .from("spiritual_profiles")
      .select("onboarding_completed")
      .eq("user_id", user.sub as string)
      .maybeSingle();

    if (!spiritual?.onboarding_completed) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
  }

  void isPublicApi;
  return supabaseResponse;
}
