import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { snapshotEnv, restoreEnv } from "./helpers/env";
import {
  applyCollectedCookiesToResponse,
  redirectWithCollectedCookies,
  toCollectedCookie,
  type CollectedRouteCookie,
} from "@/lib/supabase/route-handler";
import {
  EMAIL_CONFIRM_FLASH_COOKIE,
  EMAIL_CONFIRM_FLASH_VALUE,
  emailConfirmFlashCookieEntry,
} from "@/lib/auth/email-confirm-flash";
import { SIGNUP_INTENT_COOKIE } from "@/lib/signup-intents/continuity-cookie";

const originalEnv = snapshotEnv();

const mockVerifyOtp = vi.fn();
const mockGetUser = vi.fn();
const mockCollectedCookies = vi.fn<() => CollectedRouteCookie[]>(() => []);

vi.mock("@/lib/supabase/route-handler", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/supabase/route-handler")>();
  return {
    ...actual,
    createRouteHandlerSupabaseClient: vi.fn(() => ({
      supabase: {
        auth: {
          verifyOtp: mockVerifyOtp,
          getUser: mockGetUser,
        },
      },
      getCollectedCookies: () => mockCollectedCookies(),
    })),
  };
});

vi.mock("@/lib/signup-intents", () => ({
  loadSignupIntentByToken: vi.fn(),
  completeIntentAfterConfirmation: vi.fn(),
}));

vi.mock("@/lib/signup-intents/continuity-cookie", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/signup-intents/continuity-cookie")>();
  return {
    ...actual,
    clearSignupIntentCookie: vi.fn(),
  };
});

import { GET } from "@/app/auth/confirm/route";
import {
  completeIntentAfterConfirmation,
  loadSignupIntentByToken,
} from "@/lib/signup-intents";

beforeEach(() => {
  restoreEnv(originalEnv);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test_key";
  mockVerifyOtp.mockReset();
  mockGetUser.mockReset();
  mockCollectedCookies.mockReset();
  mockCollectedCookies.mockReturnValue([]);
  vi.mocked(loadSignupIntentByToken).mockReset();
  vi.mocked(completeIntentAfterConfirmation).mockReset();
});

afterEach(() => {
  restoreEnv(originalEnv);
});

describe("route handler supabase cookie collection", () => {
  it("captures setAll cookies and attaches them to redirect Set-Cookie", () => {
    const manualCookies: CollectedRouteCookie[] = [
      toCollectedCookie("sb-example-auth-token", "session-value", {
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 3600,
      }),
    ];

    const response = redirectWithCollectedCookies(
      new URL("https://amemchat.com.br/email-confirmado"),
      manualCookies,
      [emailConfirmFlashCookieEntry()],
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://amemchat.com.br/email-confirmado",
    );

    const setCookie = response.headers.getSetCookie();
    expect(setCookie.length).toBeGreaterThanOrEqual(2);
    expect(setCookie.some((c) => c.startsWith("sb-example-auth-token="))).toBe(
      true,
    );
    expect(
      setCookie.some((c) => c.startsWith(`${EMAIL_CONFIRM_FLASH_COOKIE}=`)),
    ).toBe(true);
    expect(setCookie.join(";")).toContain("HttpOnly");
    expect(setCookie.join(";")).toMatch(/SameSite=Lax/i);
  });

  it("deduplicates cookies by name when applying extras", () => {
    const base: CollectedRouteCookie[] = [
      toCollectedCookie("sb-test-auth-token", "v1", {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
      }),
    ];
    const updated: CollectedRouteCookie[] = [
      toCollectedCookie("sb-test-auth-token", "v2", {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 7200,
      }),
    ];
    const response = applyCollectedCookiesToResponse(
      NextResponse.next(),
      base,
      updated,
    );
    const setCookie = response.headers.getSetCookie();
    const authCookies = setCookie.filter((c) =>
      c.startsWith("sb-test-auth-token="),
    );
    expect(authCookies).toHaveLength(1);
    expect(authCookies[0]).toContain("v2");
  });

  it("createRouteHandlerSupabaseClient returns null without public env", async () => {
    const { createRouteHandlerSupabaseClient: realCreate } =
      await vi.importActual<typeof import("@/lib/supabase/route-handler")>(
        "@/lib/supabase/route-handler",
      );
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const request = new NextRequest("https://amemchat.com.br/auth/confirm");
    expect(realCreate(request)).toBeNull();
  });
});

describe("auth confirm route HTTP integration", () => {
  const intentToken = "opaqueTokenValue12345";
  const tokenHash = "a".repeat(32);

  function confirmUrl(extra?: Record<string, string>) {
    const params = new URLSearchParams({
      token_hash: tokenHash,
      type: "email",
      intent: intentToken,
      next: "/email-confirmado",
      ...extra,
    });
    return `https://amemchat.com.br/auth/confirm?${params.toString()}`;
  }

  it("redirects to email-confirmado with Set-Cookie on successful verifyOtp", async () => {
    mockVerifyOtp.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockCollectedCookies.mockReturnValue([
      toCollectedCookie("sb-proj-auth-token", "abc", {
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      }),
    ]);
    vi.mocked(loadSignupIntentByToken).mockResolvedValue({
      id: "intent-1",
      tokenHash: "hash",
      userId: "user-1",
      selectedPlanKey: "caminho",
      status: "awaiting_confirmation",
      referralCode: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmContent: null,
      utmTerm: null,
      termsVersion: "v1",
      privacyVersion: "v1",
      termsAcceptedAt: new Date().toISOString(),
      stripeCheckoutSessionId: null,
      checkoutCreatedAt: null,
      completedAt: null,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    vi.mocked(completeIntentAfterConfirmation).mockResolvedValue({
      ok: true,
      redirectTo: `/email-confirmado?intent=${intentToken}`,
    });

    const response = await GET(new NextRequest(confirmUrl()));

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("/email-confirmado");
    expect(response.headers.get("location")).toContain("intent=");
    expect(response.headers.get("location")).not.toContain("@");
    expect(response.headers.get("location")).not.toContain(tokenHash);

    const setCookie = response.headers.getSetCookie();
    expect(setCookie.some((c) => c.startsWith("sb-proj-auth-token="))).toBe(
      true,
    );
    expect(
      setCookie.some((c) =>
        c.startsWith(`${EMAIL_CONFIRM_FLASH_COOKIE}=${EMAIL_CONFIRM_FLASH_VALUE}`),
      ),
    ).toBe(true);
    expect(setCookie.some((c) => c.startsWith(`${SIGNUP_INTENT_COOKIE}=`))).toBe(
      true,
    );

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      type: "email",
      token_hash: tokenHash,
    });
  });

  it("rejects open redirect in next param", async () => {
    mockVerifyOtp.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    vi.mocked(loadSignupIntentByToken).mockResolvedValue(null);
    vi.mocked(completeIntentAfterConfirmation).mockResolvedValue({
      ok: true,
      redirectTo: "/email-confirmado",
    });

    const params = new URLSearchParams({
      token_hash: tokenHash,
      type: "email",
      next: "https://evil.example/phish",
    });
    const response = await GET(
      new NextRequest(`https://amemchat.com.br/auth/confirm?${params.toString()}`),
    );
    const location = response.headers.get("location") ?? "";
    expect(location).not.toContain("evil.example");
    expect(location).toContain("/planos");
  });

  it("maps already-used OTP to entrar?error=already without session", async () => {
    mockVerifyOtp.mockResolvedValue({
      error: {
        message: "Token has already been used",
        code: "otp_disabled",
      },
    });
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await GET(new NextRequest(confirmUrl()));
    const location = response.headers.get("location") ?? "";
    expect(location).toContain("/entrar");
    expect(location).toContain("error=already");
  });
});

describe("email confirm flash cookie", () => {
  it("uses opaque verified value without email or user id", () => {
    const entry = emailConfirmFlashCookieEntry();
    expect(entry.name).toBe(EMAIL_CONFIRM_FLASH_COOKIE);
    expect(entry.value).toBe(EMAIL_CONFIRM_FLASH_VALUE);
    expect(entry.value).not.toContain("@");
    expect(entry.options.httpOnly).toBe(true);
    expect(entry.options.maxAge).toBe(600);
  });
});

describe("login contextual banner contract", () => {
  it("login form shows post-confirm banner for context and next", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const src = readFileSync(
      join(process.cwd(), "src", "components", "auth", "login-form.tsx"),
      "utf8",
    );
    expect(src).toContain("post_confirm");
    expect(src).toContain("Seu e-mail foi confirmado");
    expect(src).toContain("/email-confirmado");
    expect(src).toContain("already");
  });
});

describe("email-confirmado page states", () => {
  it("does not silently redirect to entrar without session", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const page = readFileSync(
      join(process.cwd(), "src", "app", "(auth)", "email-confirmado", "page.tsx"),
      "utf8",
    );
    expect(page).not.toMatch(
      /redirect\(\s*["']\/entrar\?next=\/email-confirmado["']\s*\)/,
    );
    expect(page).toContain("consumeEmailConfirmFlash");
    expect(page).toContain("EmailConfirmedWithoutSessionExperience");
    expect(page).toContain("EmailConfirmNeutralExperience");
  });
});

describe("confirm route logging hygiene", () => {
  it("does not log secrets in logger calls", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const src = readFileSync(
      join(process.cwd(), "src", "app", "auth", "confirm", "route.ts"),
      "utf8",
    );
    const blocks = src.match(/logger\.(error|warn|info)\([\s\S]*?\);/g) ?? [];
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      expect(block).not.toContain("tokenHash");
      expect(block).not.toContain("token_hash:");
      expect(block).not.toContain("intentToken");
      expect(block).not.toMatch(/email\s*:/);
      expect(block).not.toContain("userId");
    }
  });
});
