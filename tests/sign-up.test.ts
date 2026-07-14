import { describe, expect, it, afterEach, vi } from "vitest";
import {
  getAppUrl,
  getEmailRedirectTo,
} from "@/lib/auth/app-url";
import {
  isSignUpDuplicateSoftFail,
  mapResendAuthError,
  mapSignUpAuthError,
  maskEmail,
  safeSignUpMessage,
} from "@/lib/auth/sign-up-errors";
import {
  getSupabaseUrl,
  hasSupabasePublicEnv,
  normalizeSupabaseUrl,
} from "@/lib/supabase/keys";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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

  it("prefers APP_URL and points confirmation to /auth/confirm → planos", () => {
    process.env.APP_URL = "https://amem-chat.vercel.app/";
    process.env.NEXT_PUBLIC_APP_URL = "https://ignored.example";
    expect(getAppUrl()).toBe("https://amem-chat.vercel.app");
    expect(getEmailRedirectTo("/planos")).toBe(
      "https://amem-chat.vercel.app/auth/confirm?next=%2Fplanos",
    );
  });

  it("falls back to NEXT_PUBLIC_APP_URL", () => {
    delete process.env.APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://amem-chat.vercel.app";
    expect(getEmailRedirectTo()).toContain("/auth/confirm?next=");
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

  it("maps email rate limit without calling it SMTP", () => {
    const mapped = mapSignUpAuthError({
      message: "email rate limit exceeded",
      code: "over_email_send_rate_limit",
    });
    expect(mapped.code).toBe("email_rate_limit");
    expect(mapped.message.toLowerCase()).not.toContain("smtp");
  });

  it("maps SMTP / confirmation email failure distinctly from rate limit", () => {
    const mapped = mapSignUpAuthError({
      message: "Error sending confirmation email",
      code: "unexpected_failure",
    });
    expect(mapped.code).toBe("email_service_unavailable");
    expect(mapped.code).not.toBe("email_rate_limit");
  });

  it("falls back to unexpected with safe message", () => {
    const mapped = mapSignUpAuthError({ message: "boom", code: "totally_unknown" });
    expect(mapped.code).toBe("unexpected");
    expect(mapped.message).toBe(safeSignUpMessage("unexpected"));
  });
});

describe("mapResendAuthError", () => {
  it("keeps rate limit and smtp distinctions", () => {
    expect(
      mapResendAuthError({ code: "over_email_send_rate_limit", message: "rate" }).code,
    ).toBe("email_rate_limit");
    expect(
      mapResendAuthError({
        code: "unexpected_failure",
        message: "Error sending confirmation email",
      }).code,
    ).toBe("email_service_unavailable");
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

describe("signup UI guarantees", () => {
  const form = readFileSync(
    join(process.cwd(), "src", "components", "auth", "sign-up-form.tsx"),
    "utf8",
  );
  const page = readFileSync(
    join(process.cwd(), "src", "app", "(auth)", "cadastro", "page.tsx"),
    "utf8",
  );

  it("always renders terms regardless of plan gating", () => {
    expect(form).toContain("Li e aceito");
    expect(form).not.toContain("requireTerms");
    expect(page).not.toContain("requireTerms");
  });

  it("supports show/hide password without confirmation field", () => {
    expect(form).toContain("Mostrar");
    expect(form).toContain("Ocultar");
    expect(form).not.toContain("Confirmar senha");
    expect(form).toContain("autoComplete=\"new-password\"");
  });

  it("includes resend confirmation with cooldown", () => {
    const checkEmail = readFileSync(
      join(process.cwd(), "src", "components", "auth", "check-email-experience.tsx"),
      "utf8",
    );
    expect(checkEmail).toContain("Reenviar e-mail de confirmação");
    expect(checkEmail).toContain("RESEND_COOLDOWN_SECONDS");
    expect(checkEmail).toContain("resendConfirmationAction");
  });
});

describe("signUpAction", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
    vi.resetModules();
    vi.clearAllMocks();
    vi.doUnmock("@/lib/supabase/keys");
    vi.doUnmock("@/lib/supabase/server");
  });

  async function loadSignUpActionWithClient(client: unknown) {
    vi.doMock("@/lib/supabase/keys", async () => {
      const actual = await vi.importActual<typeof import("@/lib/supabase/keys")>(
        "@/lib/supabase/keys",
      );
      return {
        ...actual,
        hasSupabasePublicEnv: () => true,
        getSupabaseUrl: () => "https://example.supabase.co",
        getSupabasePublishableKey: () => "sb_publishable_test",
      };
    });
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () => client),
    }));
    return import("@/lib/auth/sign-up-action");
  }

  const baseInput = {
    displayName: "Ana",
    email: "ana@domain.com",
    password: "senhaforte1",
    termsAccepted: true,
  };

  it("returns config_missing when public env check fails", async () => {
    vi.doMock("@/lib/supabase/keys", async () => {
      const actual = await vi.importActual<typeof import("@/lib/supabase/keys")>(
        "@/lib/supabase/keys",
      );
      return {
        ...actual,
        hasSupabasePublicEnv: () => false,
      };
    });
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () => null),
    }));

    const { signUpAction } = await import("@/lib/auth/sign-up-action");
    const result = await signUpAction(baseInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("config_missing");
      expect(result.message).toBe(safeSignUpMessage("config_missing"));
      expect(result.requestId).toBeTruthy();
    }
  });

  it("requires terms even without a plan", async () => {
    process.env.APP_URL = "https://amem-chat.vercel.app";
    const { signUpAction } = await loadSignUpActionWithClient({
      auth: { signUp: vi.fn() },
    });
    const result = await signUpAction({ ...baseInput, termsAccepted: false });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("terms_required");
  });

  it("rejects weak password without calling Supabase when possible", async () => {
    process.env.APP_URL = "https://amem-chat.vercel.app";
    const signUp = vi.fn();
    const { signUpAction } = await loadSignUpActionWithClient({
      auth: { signUp },
    });
    const result = await signUpAction({
      ...baseInput,
      password: "short",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("password_weak");
    expect(signUp).not.toHaveBeenCalled();
  });

  it("rejects invalid email", async () => {
    process.env.APP_URL = "https://amem-chat.vercel.app";
    const { signUpAction } = await loadSignUpActionWithClient({
      auth: { signUp: vi.fn() },
    });
    const result = await signUpAction({
      ...baseInput,
      email: "not-an-email",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("email_invalid");
  });

  it("maps auth failure and never reports ok", async () => {
    process.env.APP_URL = "https://amem-chat.vercel.app";
    const { signUpAction } = await loadSignUpActionWithClient({
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
    });

    const result = await signUpAction(baseInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("email_taken");
    }
  });

  it("maps SMTP failure when signUp returns error without throwing", async () => {
    process.env.APP_URL = "https://amem-chat.vercel.app";
    const { signUpAction } = await loadSignUpActionWithClient({
      auth: {
        signUp: vi.fn(async () => ({
          data: { user: null, session: null },
          error: {
            message: "Error sending confirmation email",
            code: "unexpected_failure",
            status: 500,
          },
        })),
      },
    });

    const result = await signUpAction(baseInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("email_service_unavailable");
      expect(result.requestId).toBeTruthy();
    }
  });

  it("succeeds with confirmation required and redirects to check-email", async () => {
    process.env.APP_URL = "https://amem-chat.vercel.app";
    const signUp = vi.fn(async () => ({
      data: {
        user: { id: "u1", identities: [{ id: "i1" }] },
        session: null,
      },
      error: null,
    }));

    const { signUpAction } = await loadSignUpActionWithClient({
      auth: { signUp },
    });

    const result = await signUpAction(baseInput);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.needsEmailConfirmation).toBe(true);
      expect(result.redirectTo).toContain("/confira-seu-email");
    }
    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "ana@domain.com",
        options: expect.objectContaining({
          data: expect.objectContaining({
            display_name: "Ana",
            terms_version: expect.any(String),
            privacy_version: expect.any(String),
          }),
          emailRedirectTo:
            "https://amem-chat.vercel.app/auth/confirm?next=%2Fplanos",
        }),
      }),
    );
    // Password must never appear in logs; also assert call omitted password dump elsewhere.
    const callArg = signUp.mock.calls[0]?.[0] as { password?: string };
    expect(callArg.password).toBe("senhaforte1");
  });
});

describe("resendConfirmationAction", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
    vi.resetModules();
    vi.clearAllMocks();
    vi.doUnmock("@/lib/supabase/keys");
    vi.doUnmock("@/lib/supabase/server");
  });

  it("does not call real network and returns generic success message", async () => {
    process.env.APP_URL = "https://amemchat.com.br";
    const resend = vi.fn(async () => ({ data: {}, error: null }));
    vi.doMock("@/lib/supabase/keys", async () => {
      const actual = await vi.importActual<typeof import("@/lib/supabase/keys")>(
        "@/lib/supabase/keys",
      );
      return {
        ...actual,
        hasSupabasePublicEnv: () => true,
      };
    });
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () => ({ auth: { resend } })),
    }));

    const { resendConfirmationAction } = await import(
      "@/lib/auth/resend-confirmation-action"
    );
    const result = await resendConfirmationAction({ email: "ana@domain.com" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message.toLowerCase()).toContain("confirmação");
      expect(result.message.toLowerCase()).not.toContain("ana@");
    }
    expect(resend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "signup",
        email: "ana@domain.com",
      }),
    );
  });

  it("surfaces SMTP failure honestly on resend", async () => {
    process.env.APP_URL = "https://amemchat.com.br";
    vi.doMock("@/lib/supabase/keys", async () => {
      const actual = await vi.importActual<typeof import("@/lib/supabase/keys")>(
        "@/lib/supabase/keys",
      );
      return {
        ...actual,
        hasSupabasePublicEnv: () => true,
      };
    });
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () => ({
        auth: {
          resend: vi.fn(async () => ({
            data: null,
            error: {
              message: "Error sending confirmation email",
              code: "unexpected_failure",
            },
          })),
        },
      })),
    }));

    const { resendConfirmationAction } = await import(
      "@/lib/auth/resend-confirmation-action"
    );
    const result = await resendConfirmationAction({ email: "ana@domain.com" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("email_service_unavailable");
  });
});

describe("auth callback safety", () => {
  it("uses safeNextPath and intent completion", () => {
    const src = readFileSync(
      join(process.cwd(), "src", "app", "auth", "callback", "route.ts"),
      "utf8",
    );
    expect(src).toContain("safeNextPath");
    expect(src).toContain("completeIntentAfterConfirmation");
    expect(src).not.toMatch(/password/);
  });
});

describe("sanitized signup logs", () => {
  it("sign-up-action masks email and never logs password fields", () => {
    const src = readFileSync(
      join(process.cwd(), "src", "lib", "auth", "sign-up-action.ts"),
      "utf8",
    );
    expect(src).toContain("emailMasked");
    expect(src).toContain("maskEmail");
    const loggerBlocks = src.match(/logger\.(error|warn|info)\([^;]+;/gs) ?? [];
    expect(loggerBlocks.length).toBeGreaterThan(0);
    for (const block of loggerBlocks) {
      expect(block).not.toMatch(/\bpassword\s*:/);
      expect(block).not.toContain("parsed.data.password");
    }
  });
});
