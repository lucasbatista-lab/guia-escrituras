import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { snapshotEnv, restoreEnv } from "./helpers/env";
import {
  buildWwwToApexRedirectHref,
  isLocalHostname,
  isVercelPreviewHostname,
  PRODUCTION_APEX_HOST,
  PRODUCTION_WWW_HOST,
  resolveSafeHostname,
} from "@/lib/edge/canonical-host";
import {
  isApiPath,
  isAuthCallbackPath,
  isPrivateAppPath,
} from "@/lib/edge/private-paths";
import { hasLikelySupabaseSessionCookie } from "@/lib/edge/session-cookie";
import { safeNextPath } from "@/lib/navigation/safe-next-path";
import {
  ACQ_FIRST_COOKIE,
  ACQ_FIRST_MAX_AGE_SECONDS,
  ACQ_LAST_COOKIE,
  ACQ_LAST_MAX_AGE_SECONDS,
  acquisitionCookieOptions,
  applyAcquisitionCapture,
  parseAcquisitionCookie,
  touchFromSearchParams,
  UTM_MAX_LEN,
} from "@/lib/acquisition";
import { publicCanonicalPath } from "@/lib/seo";
import { updateSession } from "@/lib/supabase/proxy";

const root = process.cwd();

function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("canonical host www → apex", () => {
  it("maps www root, internal path and query/UTM to apex", () => {
    expect(
      buildWwwToApexRedirectHref({
        hostname: PRODUCTION_WWW_HOST,
        pathname: "/",
        search: "",
      }),
    ).toBe(`https://${PRODUCTION_APEX_HOST}/`);

    expect(
      buildWwwToApexRedirectHref({
        hostname: PRODUCTION_WWW_HOST,
        pathname: "/planos",
        search: "",
      }),
    ).toBe(`https://${PRODUCTION_APEX_HOST}/planos`);

    expect(
      buildWwwToApexRedirectHref({
        hostname: PRODUCTION_WWW_HOST,
        pathname: "/",
        search: "?utm_source=instagram&ref=ABC",
      }),
    ).toBe(
      `https://${PRODUCTION_APEX_HOST}/?utm_source=instagram&ref=ABC`,
    );
  });

  it("does not loop on apex and skips localhost / vercel.app / invalid hosts", () => {
    expect(
      buildWwwToApexRedirectHref({
        hostname: PRODUCTION_APEX_HOST,
        pathname: "/planos",
        search: "?utm_source=ig",
      }),
    ).toBeNull();

    expect(
      buildWwwToApexRedirectHref({
        hostname: "localhost",
        pathname: "/",
        search: "",
      }),
    ).toBeNull();

    expect(
      buildWwwToApexRedirectHref({
        hostname: "guia-escrituras.vercel.app",
        pathname: "/",
        search: "",
      }),
    ).toBeNull();

    expect(resolveSafeHostname("www.amemchat.com.br/evil")).toBeNull();
    expect(resolveSafeHostname("www.amemchat.com.br@evil.com")).toBeNull();
    expect(resolveSafeHostname("")).toBeNull();
    expect(isLocalHostname("127.0.0.1")).toBe(true);
    expect(isVercelPreviewHostname("foo.vercel.app")).toBe(true);
  });

  it("proxy applies 308 www redirect before session/acquisition", () => {
    const proxy = read("src", "proxy.ts");
    expect(proxy).toContain("buildWwwToApexRedirectHref");
    expect(proxy).toContain("NextResponse.redirect(apexHref, 308)");
    const fnStart = proxy.indexOf("export async function proxy");
    const body = proxy.slice(fnStart);
    expect(body.indexOf("buildWwwToApexRedirectHref")).toBeLessThan(
      body.indexOf("updateSession"),
    );
    expect(body.indexOf("updateSession")).toBeLessThan(
      body.indexOf("applyAcquisitionCapture"),
    );
    // With src/app, Next only picks up src/proxy.ts (not a root proxy.ts).
    expect(proxy).toContain("src/proxy.ts");
  });
});

describe("private path classification", () => {
  it("marks platform and admin as private; APIs and auth callbacks are not HTML gates", () => {
    expect(isPrivateAppPath("/admin")).toBe(true);
    expect(isPrivateAppPath("/admin/aquisicao")).toBe(true);
    expect(isPrivateAppPath("/conta")).toBe(true);
    expect(isPrivateAppPath("/conversar")).toBe(true);
    expect(isPrivateAppPath("/conversas")).toBe(true);
    expect(isPrivateAppPath("/inicio")).toBe(true);
    expect(isPrivateAppPath("/personalizar")).toBe(true);
    expect(isPrivateAppPath("/planos")).toBe(false);
    expect(isPrivateAppPath("/entrar")).toBe(false);
    expect(isApiPath("/api/admin/users")).toBe(true);
    expect(isApiPath("/api/chat")).toBe(true);
    expect(isAuthCallbackPath("/auth/callback")).toBe(true);
    expect(isAuthCallbackPath("/auth/confirm")).toBe(true);
  });
});

describe("anonymous private HTML redirects (HTTP)", () => {
  const original = snapshotEnv();

  afterEach(() => {
    restoreEnv(original);
    vi.restoreAllMocks();
  });

  it("anonymous /admin /conta /conversar /conversas get HTTP 307 with safe next", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test-key";
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    for (const path of ["/admin", "/conta", "/conversar", "/conversas"]) {
      const req = new NextRequest(`https://amemchat.com.br${path}`);
      const res = await updateSession(req);
      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toBeTruthy();
      const url = new URL(location!);
      expect(url.pathname).toBe("/entrar");
      expect(url.searchParams.get("next")).toBe(path);
      expect(safeNextPath(url.searchParams.get("next"), "/inicio")).toBe(path);
    }
  });

  it("rejects open redirect via next construction", () => {
    expect(safeNextPath("//evil.com", "/inicio")).toBe("/inicio");
    expect(safeNextPath("https://evil.com", "/inicio")).toBe("/inicio");
    expect(safeNextPath("/conta", "/inicio")).toBe("/conta");
  });

  it("authenticated-looking session cookie skips fast anonymous gate path", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test-key";

    const req = new NextRequest("https://amemchat.com.br/conta", {
      headers: {
        cookie: "sb-example-auth-token=fake-session-value",
      },
    });
    expect(hasLikelySupabaseSessionCookie(req)).toBe(true);
    // With a cookie present, updateSession will call Supabase getUser (network).
    // We only assert the optimistic cookie detector here to avoid external calls.
  });

  it("proxy and supabase gate keep API paths out of HTML login redirects", () => {
    const gate = read("src", "lib", "supabase", "proxy.ts");
    expect(gate).toContain("isApiPath");
    expect(gate).toContain("redirectAnonymousToLogin");
    expect(gate).toContain("safeNextPath");
    expect(gate).toContain("hasLikelySupabaseSessionCookie");
  });

  it("auth callback routes remain public entry points", () => {
    expect(read("src", "app", "auth", "callback", "route.ts")).toContain(
      "safeNextPath",
    );
    expect(read("src", "app", "auth", "confirm", "route.ts")).toContain(
      "safeNextPath",
    );
    expect(isPrivateAppPath("/auth/callback")).toBe(false);
    expect(isPrivateAppPath("/entrar")).toBe(false);
    expect(isPrivateAppPath("/cadastro")).toBe(false);
  });
});

describe("acquisition capture under proxy (cache-compatible)", () => {
  const original = snapshotEnv();

  afterEach(() => {
    restoreEnv(original);
  });

  it("captures each allowed param and ignores unknown ones", () => {
    const req = new NextRequest(
      "https://amemchat.com.br/?utm_source=instagram&utm_medium=organic_social&utm_campaign=launch_jul26&utm_content=video_01&utm_term=fe&ref=AMIGO1&evil=drop",
    );
    const res = applyAcquisitionCapture(req, NextResponse.next());
    const last = parseAcquisitionCookie(res.cookies.get(ACQ_LAST_COOKIE)?.value);
    expect(last?.utm_source).toBe("instagram");
    expect(last?.utm_medium).toBe("organic_social");
    expect(last?.utm_campaign).toBe("launch_jul26");
    expect(last?.utm_content).toBe("video_01");
    expect(last?.utm_term).toBe("fe");
    expect(last?.ref).toBe("AMIGO1");
    expect(JSON.stringify(last)).not.toContain("evil");
  });

  it("truncates long values, rejects controls, and skips empty campaign", () => {
    const long = "a".repeat(200);
    const touch = touchFromSearchParams(
      new URLSearchParams(`utm_source=${long}`),
      "/",
    );
    expect(touch?.utm_source?.length).toBe(UTM_MAX_LEN);

    expect(
      touchFromSearchParams(new URLSearchParams("utm_source=bad\u0000x"), "/"),
    ).toBeNull();

    const bare = new NextRequest("https://amemchat.com.br/");
    const res = applyAcquisitionCapture(bare, NextResponse.next());
    expect(res.cookies.get(ACQ_FIRST_COOKIE)).toBeUndefined();
    expect(res.cookies.get(ACQ_LAST_COOKIE)).toBeUndefined();
  });

  it("uses centralized cookie flags and first/last policy", () => {
    process.env.VERCEL_ENV = "production";
    process.env.NODE_ENV = "production";
    const opts = acquisitionCookieOptions(ACQ_FIRST_MAX_AGE_SECONDS);
    expect(opts.path).toBe("/");
    expect(opts.sameSite).toBe("lax");
    expect(opts.secure).toBe(true);
    expect(opts.httpOnly).toBe(true);
    expect(opts.maxAge).toBe(ACQ_FIRST_MAX_AGE_SECONDS);
    expect(opts.domain).toBe(".amemchat.com.br");
    expect(ACQ_LAST_MAX_AGE_SECONDS).toBe(30 * 24 * 60 * 60);

    const firstReq = new NextRequest(
      "https://amemchat.com.br/?utm_source=instagram",
    );
    const firstRes = applyAcquisitionCapture(firstReq, NextResponse.next());
    expect(firstRes.cookies.get(ACQ_FIRST_COOKIE)?.value).toBeTruthy();
    expect(firstRes.cookies.get(ACQ_LAST_COOKIE)?.value).toBeTruthy();

    const secondReq = new NextRequest(
      "https://amemchat.com.br/?utm_source=tiktok",
      {
        headers: {
          cookie: `${ACQ_FIRST_COOKIE}=${firstRes.cookies.get(ACQ_FIRST_COOKIE)!.value}`,
        },
      },
    );
    const secondRes = applyAcquisitionCapture(secondReq, NextResponse.next());
    expect(secondRes.cookies.get(ACQ_FIRST_COOKIE)).toBeUndefined();
    expect(
      parseAcquisitionCookie(secondRes.cookies.get(ACQ_LAST_COOKIE)?.value)
        ?.utm_source,
    ).toBe("tiktok");
  });

  it("canonical stays free of UTM/ref and signup still merges cookies", () => {
    expect(publicCanonicalPath("/?utm_source=instagram&ref=X")).toBe("/");
    expect(read("src", "lib", "auth", "sign-up-action.ts")).toContain(
      "resolveTrackingForSignupIntent",
    );
    expect(read("src", "proxy.ts")).toContain("applyAcquisitionCapture");
  });

  it("www redirect response must not set acquisition cookies (no duplicate)", async () => {
    const { proxy } = await import("../src/proxy");
    const req = new NextRequest(
      "https://www.amemchat.com.br/?utm_source=instagram",
    );
    const res = await proxy(req);
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe(
      "https://amemchat.com.br/?utm_source=instagram",
    );
    expect(res.cookies.get(ACQ_FIRST_COOKIE)).toBeUndefined();
    expect(res.cookies.get(ACQ_LAST_COOKIE)).toBeUndefined();
  });
});

describe("edge regressions (contracts)", () => {
  it("keeps private noindex, robots, and health intact", () => {
    expect(read("src", "app", "(platform)", "layout.tsx")).toContain(
      "privateRobotsMetadata",
    );
    expect(read("src", "app", "admin", "layout.tsx")).toContain(
      "privateRobotsMetadata",
    );
    expect(read("src", "app", "robots.ts")).toContain("getCanonicalSiteUrl");
    expect(read("src", "app", "api", "health", "route.ts")).toContain(
      "VERCEL_GIT_COMMIT_SHA",
    );
  });
});
