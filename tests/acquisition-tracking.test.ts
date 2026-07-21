import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { AppError } from "@/lib/safety";
import {
  ACQ_FIRST_COOKIE,
  ACQ_LAST_COOKIE,
  applyAcquisitionCapture,
  buildCampaignQuery,
  hasCampaignSignal,
  LAUNCH_CAMPAIGN_EXAMPLES,
  mergeConversionTracking,
  parseAcquisitionCookie,
  sanitizeLandingPath,
  sanitizeTrackingValue,
  serializeAcquisitionCookie,
  touchFromSearchParams,
  UTM_MAX_LEN,
} from "@/lib/acquisition";

describe("acquisition sanitize", () => {
  it("truncates long values and rejects control characters", () => {
    const long = "a".repeat(200);
    expect(sanitizeTrackingValue(long, UTM_MAX_LEN)?.length).toBe(UTM_MAX_LEN);
    expect(sanitizeTrackingValue("bad\u0000value", UTM_MAX_LEN)).toBeNull();
    expect(sanitizeTrackingValue("  ig  ", 120)).toBe("ig");
  });

  it("accepts only internal landing paths", () => {
    expect(sanitizeLandingPath("/planos")).toBe("/planos");
    expect(sanitizeLandingPath("/cadastro?x=1")).toBe("/cadastro");
    expect(sanitizeLandingPath("//evil.com")).toBeNull();
    expect(sanitizeLandingPath("https://evil.com")).toBeNull();
    expect(sanitizeLandingPath("javascript:alert(1)")).toBeNull();
  });

  it("builds touch only when campaign signal exists", () => {
    const withUtm = touchFromSearchParams(
      new URLSearchParams("utm_source=instagram&utm_campaign=launch_jul26"),
      "/planos",
    );
    expect(withUtm?.utm_source).toBe("instagram");
    expect(withUtm?.landing_path).toBe("/planos");
    expect(
      touchFromSearchParams(new URLSearchParams(""), "/"),
    ).toBeNull();
  });
});

describe("acquisition cookies first/last", () => {
  it("first campaign creates first and last; new campaign keeps first, updates last", () => {
    const firstTouch = touchFromSearchParams(
      new URLSearchParams(
        "utm_source=instagram&utm_medium=organic_social&utm_campaign=launch_jul26&utm_content=video_01",
      ),
      "/",
    )!;
    const secondTouch = touchFromSearchParams(
      new URLSearchParams(
        "utm_source=tiktok&utm_medium=organic_social&utm_campaign=launch_jul26&utm_content=video_02",
      ),
      "/planos",
    )!;

    const req1 = new NextRequest("https://amemchat.com.br/?utm_source=instagram&utm_medium=organic_social&utm_campaign=launch_jul26&utm_content=video_01");
    let res = applyAcquisitionCapture(req1, NextResponse.next());
    const firstSet = res.cookies.get(ACQ_FIRST_COOKIE)?.value;
    const lastSet = res.cookies.get(ACQ_LAST_COOKIE)?.value;
    expect(parseAcquisitionCookie(firstSet)?.utm_source).toBe("instagram");
    expect(parseAcquisitionCookie(lastSet)?.utm_source).toBe("instagram");

    const req2 = new NextRequest(
      "https://amemchat.com.br/planos?utm_source=tiktok&utm_medium=organic_social&utm_campaign=launch_jul26&utm_content=video_02",
      {
        headers: {
          cookie: `${ACQ_FIRST_COOKIE}=${serializeAcquisitionCookie(firstTouch)}; ${ACQ_LAST_COOKIE}=${serializeAcquisitionCookie(firstTouch)}`,
        },
      },
    );
    res = applyAcquisitionCapture(req2, NextResponse.next());
    // First must not be rewritten when already present
    expect(res.cookies.get(ACQ_FIRST_COOKIE)).toBeUndefined();
    expect(parseAcquisitionCookie(res.cookies.get(ACQ_LAST_COOKIE)?.value)?.utm_source).toBe(
      "tiktok",
    );
    expect(secondTouch.utm_content).toBe("video_02");
  });

  it("direct traffic does not clear attribution cookies", () => {
    const existing = touchFromSearchParams(
      new URLSearchParams("utm_source=instagram&utm_campaign=launch_jul26"),
      "/",
    )!;
    const req = new NextRequest("https://amemchat.com.br/como-funciona", {
      headers: {
        cookie: `${ACQ_FIRST_COOKIE}=${serializeAcquisitionCookie(existing)}`,
      },
    });
    const res = applyAcquisitionCapture(req, NextResponse.next());
    expect(res.cookies.get(ACQ_FIRST_COOKIE)).toBeUndefined();
    expect(res.cookies.get(ACQ_LAST_COOKIE)).toBeUndefined();
  });

  it("ignores invalid cookies", () => {
    expect(parseAcquisitionCookie("not-json")).toBeNull();
    expect(parseAcquisitionCookie(encodeURIComponent('{"v":99}'))).toBeNull();
    expect(
      parseAcquisitionCookie(
        encodeURIComponent(JSON.stringify({ v: 1, captured_at: "x" })),
      ),
    ).toBeNull();
  });

  it("reads raw JSON and legacy encodeURIComponent cookie payloads", () => {
    const touch = touchFromSearchParams(
      new URLSearchParams("utm_source=instagram&utm_campaign=launch_jul26"),
      "/",
    )!;
    const raw = serializeAcquisitionCookie(touch);
    expect(raw.startsWith("{")).toBe(true);
    expect(parseAcquisitionCookie(raw)?.utm_source).toBe("instagram");
    expect(parseAcquisitionCookie(encodeURIComponent(raw))?.utm_source).toBe(
      "instagram",
    );
    expect(
      parseAcquisitionCookie(encodeURIComponent(encodeURIComponent(raw)))
        ?.utm_source,
    ).toBe("instagram");
  });
});

describe("acquisition merge for signup_intent", () => {
  it("prefers explicit > last > first", () => {
    const first = touchFromSearchParams(
      new URLSearchParams("utm_source=instagram&utm_campaign=first_camp"),
      "/",
    );
    const last = touchFromSearchParams(
      new URLSearchParams("utm_source=tiktok&utm_campaign=last_camp&utm_content=v2"),
      "/planos",
    );
    const merged = mergeConversionTracking(
      { utmSource: "youtube", utmTerm: "fe" },
      last,
      first,
    );
    expect(merged.utmSource).toBe("youtube");
    expect(merged.utmCampaign).toBe("last_camp");
    expect(merged.utmContent).toBe("v2");
    expect(merged.utmTerm).toBe("fe");
  });

  it("fills from cookies when form has no tracking", () => {
    const last = touchFromSearchParams(
      new URLSearchParams("utm_source=share&utm_medium=user&ref=ABC123"),
      "/",
    );
    const merged = mergeConversionTracking({}, last, null);
    expect(merged.utmSource).toBe("share");
    expect(merged.referralCode).toBe("ABC123");
    expect(hasCampaignSignal(merged)).toBe(true);
  });
});

describe("campaign conventions", () => {
  it("documents launch examples", () => {
    expect(LAUNCH_CAMPAIGN_EXAMPLES.some((e) => e.channel === "instagram")).toBe(
      true,
    );
    expect(
      buildCampaignQuery({
        utm_source: "instagram",
        utm_medium: "organic_social",
        utm_campaign: "launch_jul26",
        utm_content: "video_01",
      }),
    ).toContain("utm_source=instagram");
  });
});

describe("acquisition admin + wiring contracts", () => {
  it("proxy applies acquisition capture without stripping UTMs", async () => {
    const proxy = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/proxy.ts", "utf8"),
    );
    expect(proxy).toContain("applyAcquisitionCapture");
    expect(proxy).toContain("updateSession");
    expect(proxy).toContain("buildWwwToApexRedirectHref");
    expect(proxy).toContain("308");
    expect(proxy).toContain("src/proxy.ts");
  });

  it("signup and plan continuation merge cookie attribution", async () => {
    const signUp = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/lib/auth/sign-up-action.ts", "utf8"),
    );
    const cont = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/lib/auth/plan-continuation-action.ts", "utf8"),
    );
    expect(signUp).toContain("resolveTrackingForSignupIntent");
    expect(cont).toContain("resolveTrackingForSignupIntent");
  });

  it("email confirm URL stays free of utm params", async () => {
    const svc = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/lib/signup-intents/service.ts", "utf8"),
    );
    expect(svc).toContain("getAuthConfirmUrlForIntent");
    expect(svc).not.toMatch(/utm_source.*getAuthConfirmUrlForIntent|getAuthConfirmUrlForIntent[\s\S]{0,200}utm_source/);
  });

  it("privacy mentions first-party campaign cookies without conversation content", async () => {
    const privacy = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/app/(marketing)/privacidade/page.tsx", "utf8"),
    );
    expect(privacy).toContain("cookies first-party");
    expect(privacy).toContain("conteúdo das conversas");
  });

  it("admin acquisition page is gated and no-store via layout dynamic", async () => {
    const page = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/app/admin/aquisicao/page.tsx", "utf8"),
    );
    const layout = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/app/admin/layout.tsx", "utf8"),
    );
    expect(page).toContain("getAdminAcquisitionReport");
    expect(page).toContain("force-dynamic");
    expect(page).not.toContain("messages");
    expect(layout).toContain("AdminMobileNav");
    expect(layout).toContain("isAdmin");
    const nav = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/components/admin/admin-mobile-nav.tsx", "utf8"),
    );
    expect(nav).toContain("/admin/aquisicao");
  });
});

describe("getAdminAcquisitionReport", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.doUnmock("@/lib/auth/session");
    vi.doUnmock("@/lib/supabase/admin");
  });

  it("rejects non-admin", async () => {
    vi.doMock("@/lib/auth/session", () => ({
      requireAdminUser: vi.fn(async () => {
        throw new AppError("forbidden", "forbidden", 403, "Acesso restrito.");
      }),
      requireAuthUser: vi.fn(),
      getAuthUserContext: vi.fn(),
    }));
    const { getAdminAcquisitionReport } = await import(
      "@/lib/admin/acquisition"
    );
    await expect(getAdminAcquisitionReport(30)).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("aggregates >1000 intents without silent truncation under max pages", async () => {
    const total = 1205;
    const rows = Array.from({ length: total }, (_, i) => ({
      status: i % 10 === 0 ? "completed" : "awaiting_confirmation",
      selected_plan_key: "essencial",
      referral_code: i % 50 === 0 ? "REF" : null,
      utm_source: i % 2 === 0 ? "instagram" : "tiktok",
      utm_campaign: "launch_jul26",
      utm_content: i % 2 === 0 ? "video_01" : "video_02",
      utm_medium: "organic_social",
      utm_term: null,
      created_at: "2026-07-01T00:00:00Z",
      id: `id-${i}`,
    }));

    let rangeCalls = 0;
    const client = {
      from: () => ({
        select: () => ({
          gte: () => ({
            order: () => ({
              order: () => ({
                range: (from: number, to: number) => {
                  rangeCalls += 1;
                  return Promise.resolve({
                    data: rows.slice(from, to + 1),
                    error: null,
                  });
                },
              }),
            }),
          }),
        }),
      }),
    };

    vi.doMock("@/lib/auth/session", () => ({
      requireAdminUser: vi.fn(async () => ({ userId: "admin", isAdmin: true })),
      requireAuthUser: vi.fn(),
      getAuthUserContext: vi.fn(),
    }));
    vi.doMock("@/lib/supabase/admin", () => ({
      createAdminClient: () => client,
    }));

    const { getAdminAcquisitionReport } = await import(
      "@/lib/admin/acquisition"
    );
    const report = await getAdminAcquisitionReport(30);
    expect(report.totalSignups).toBe(1205);
    expect(report.partial).toBe(false);
    expect(rangeCalls).toBeGreaterThanOrEqual(2);
    expect(report.bySource.some((r) => r.key === "instagram")).toBe(true);
    expect(report.byCampaign[0]?.key).toBe("launch_jul26");
    expect(report.subscriptions).toBeGreaterThan(0);
    expect(report.attributedConversionPct).not.toBeNull();
  });
});

describe("referral self-block still intact", () => {
  it("keeps assertNotSelfReferral", async () => {
    const { assertNotSelfReferral } = await import("@/lib/referrals");
    expect(assertNotSelfReferral("a", "a").ok).toBe(false);
    expect(assertNotSelfReferral("a", "b").ok).toBe(true);
  });
});

describe("home tracking link still present", () => {
  it("home keeps TrackingLink to planos", async () => {
    const home = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/app/(marketing)/page.tsx", "utf8"),
    );
    expect(home).toContain("TrackingLink");
    expect(home).toContain('href="/planos"');
  });
});
