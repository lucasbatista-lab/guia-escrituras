import { describe, expect, it, afterEach, vi } from "vitest";
import {
  getAppUrl,
  getEmailRedirectTo,
} from "@/lib/auth/app-url";
import {
  isSignUpDuplicateSoftFail,
  mapSignUpAuthError,
  maskEmail,
  safeSignUpMessage,
} from "@/lib/auth/sign-up-errors";
import {
  getSupabaseUrl,
  hasSupabasePublicEnv,
  normalizeSupabaseUrl,
} from "@/lib/supabase/keys";

describe("normalizeSupabaseUrl", () => {
  it("repairs tps:// typo to https://", () => {
    expect(normalizeSupabaseUrl("tps://abc.supabase.co")).toBe(
      "https://abc.supabase.co",
    );
  });

  it("accepts https and strips trailing slash", () => {
    expect(normalizeSupabaseUrl("https://abc.supabase.co/")).toBe(
      "https://abc.supabase.co",
    );
  });

  it("prefixes host-only values with https", () => {
    expect(normalizeSupabaseUrl("abc.supabase.co")).toBe(
      "https://abc.supabase.co",
    );
  });
});

describe("getSupabaseUrl with broken production value", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("exposes a usable URL when env has tps:// typo", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "tps://jpvm.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_x";
    expect(getSupabaseUrl()).toBe("https://jpvm.supabase.co");
    expect(hasSupabasePublicEnv()).toBe(true);
  });
});

describe("getEmailRedirectTo", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("prefers APP_URL and points confirmation to /auth/callback → onboarding", () => {
    process.env.APP_URL = "https://amem-chat.vercel.app/";
    process.env.NEXT_PUBLIC_APP_URL = "https://ignored.example";
    expect(getAppUrl()).toBe("https://amem-chat.vercel.app");
    expect(getEmailRedirectTo("/onboarding")).toBe(
      "https://amem-chat.vercel.app/auth/callback?next=%2Fonboarding",
    );
  });

  it("falls back to NEXT_PUBLIC_APP_URL", () => {
    delete process.env.APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://amem-chat.vercel.app";
    expect(getEmailRedirectTo()).toContain("/auth/callback?next=");
  });
});

describe("mapSignUpAuthError", () => {
  it("maps duplicate email", () => {
    expect(
      mapSignUpAuthError({ message: "User already registered", code: "email_exists" })
        .code,
    ).toBe("email_taken");
  });

  it("maps invalid email", () => {
    expect(
      mapSignUpAuthError({
        message: 'Email address "x" is invalid',
        code: "email_address_invalid",
      }).code,
    ).toBe("email_invalid");
  });

  it("maps weak password", () => {
    expect(
      mapSignUpAuthError({ message: "Password is too weak", code: "weak_password" })
        .code,
    ).toBe("password_weak");
  });

  it("maps email rate limit", () => {
    expect(
      mapSignUpAuthError({
        message: "email rate limit exceeded",
        code: "over_email_send_rate_limit",
      }).code,
    ).toBe("email_rate_limit");
  });

  it("falls back to unexpected with safe message", () => {
    const mapped = mapSignUpAuthError({ message: "boom", code: "unexpected_failure" });
    expect(mapped.code).toBe("unexpected");
    expect(mapped.message).toBe(safeSignUpMessage("unexpected"));
  });
});

describe("isSignUpDuplicateSoftFail", () => {
  it("detects empty identities without session", () => {
    expect(
      isSignUpDuplicateSoftFail({
        user: { identities: [] },
        session: null,
      }),
    ).toBe(true);
  });

  it("does not flag a real pending confirmation", () => {
    expect(
      isSignUpDuplicateSoftFail({
        user: { identities: [{ id: "1" }] },
        session: null,
      }),
    ).toBe(false);
  });
});

describe("maskEmail", () => {
  it("never returns the full local part", () => {
    expect(maskEmail("giulia@domain.com")).toBe("g***@domain.com");
    expect(maskEmail("giulia@domain.com")).not.toContain("giulia@");
  });
});

describe("signUpAction", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns config_missing without supabase env and does not need secret key", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SECRET_KEY;

    const { signUpAction } = await import("@/lib/auth/sign-up-action");
    const result = await signUpAction({
      displayName: "Ana",
      email: "ana@domain.com",
      password: "senhaforte1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("config_missing");
      expect(result.message).toBe(safeSignUpMessage("config_missing"));
      expect(result.requestId).toBeTruthy();
    }
  });

  it("maps auth failure and never reports ok", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    process.env.APP_URL = "https://amem-chat.vercel.app";

    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () => ({
        auth: {
          signUp: vi.fn(async () => ({
            data: { user: null, session: null },
            error: {
              message: "User already registered",
              code: "email_exists",
              status: 422,
            },
          })),
        },
      })),
    }));

    const { signUpAction } = await import("@/lib/auth/sign-up-action");
    const result = await signUpAction({
      displayName: "Ana",
      email: "ana@domain.com",
      password: "senhaforte1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("email_taken");
    }
  });

  it("succeeds with confirmation required and does not redirect yet", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    process.env.APP_URL = "https://amem-chat.vercel.app";

    const signUp = vi.fn(async () => ({
      data: {
        user: { id: "u1", identities: [{ id: "i1" }] },
        session: null,
      },
      error: null,
    }));

    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () => ({
        auth: { signUp },
      })),
    }));

    const { signUpAction } = await import("@/lib/auth/sign-up-action");
    const result = await signUpAction({
      displayName: "Ana",
      email: "ana@domain.com",
      password: "senhaforte1",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.needsEmailConfirmation).toBe(true);
      expect(result.redirectTo).toBeNull();
    }
    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "ana@domain.com",
        options: expect.objectContaining({
          data: { display_name: "Ana" },
          emailRedirectTo:
            "https://amem-chat.vercel.app/auth/callback?next=%2Fonboarding",
        }),
      }),
    );
  });
});
