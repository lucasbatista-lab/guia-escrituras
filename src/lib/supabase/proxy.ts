import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, hasSupabaseEnv } from "@/lib/utils";

const PUBLIC_PREFIXES = [
  "/",
  "/planos",
  "/como-funciona",
  "/mensagens-personalizadas",
  "/entrar",
  "/cadastro",
  "/recuperar-senha",
  "/auth",
  "/api/health",
];

const PLATFORM_PREFIXES = [
  "/inicio",
  "/conversar",
  "/conversas",
  "/jornada",
  "/conta",
  "/onboarding",
];

const ADMIN_PREFIXES = ["/admin"];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  if (!hasSupabaseEnv()) {
    // Foundation mode: allow browsing without Supabase; API routes handle demos.
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabaseAnonKey(),
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
  const pathname = request.nextUrl.pathname;

  const isPublic =
    matchesPrefix(pathname, PUBLIC_PREFIXES) ||
    pathname.startsWith("/api/");

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

  // Admin role is checked in layouts/API via admin_roles — not only middleware.
  if (user && pathname === "/entrar") {
    const url = request.nextUrl.clone();
    url.pathname = "/inicio";
    return NextResponse.redirect(url);
  }

  void isPublic;
  return supabaseResponse;
}
