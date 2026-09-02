import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { snapshotEnv, restoreEnv } from "./helpers/env";
import { safeSignUpMessage } from "@/lib/auth/sign-up-errors";

describe("paid signup → checkout without session", () => {
  const original = snapshotEnv();

  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.doUnmock("@/lib/supabase/keys");
    vi.doUnmock("@/lib/supabase/server");
    vi.doUnmock("@/lib/signup-intents");
    vi.doUnmock("@/lib/stripe/checkout");
    restoreEnv(original);
  });

  async function loadPaidSignUp(mocks: {
    signUp: ReturnType<typeof vi.fn>;
    signInWithPassword?: ReturnType<typeof vi.fn>;
    completeIntent?: ReturnType<typeof vi.fn>;
    checkout?: ReturnType<typeof vi.fn>;
  }) {
    process.env.APP_URL = "https://amemchat.com.br";
    process.env.SUPABASE_SECRET_KEY = "sb_secret_test";

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
          signUp: mocks.signUp,
          signInWithPassword: mocks.signInWithPassword ?? vi.fn(),
        },
      })),
    }));

    vi.doMock("@/lib/signup-intents/continuity-cookie", () => ({
      setSignupIntentCookie: vi.fn(async () => undefined),
    }));

    vi.doMock("@/lib/acquisition", () => ({
      resolveTrackingForSignupIntent: vi.fn(async (t: unknown) => t ?? {}),
    }));

    vi.doMock("@/lib/signup-intents", async () => {
      const actual = await vi.importActual<typeof import("@/lib/signup-intents")>(
        "@/lib/signup-intents",
      );
      return {
        ...actual,
        createSignupIntentWithToken: vi.fn(async () => ({
          record: { id: "intent-1" },
          token: "tok_opaque_1234567890ab",
        })),
        completeIntentAfterConfirmation: mocks.completeIntent ??
          vi.fn(async () => ({
            ok: true,
            redirectTo: "/email-confirmado?intent=tok",
          })),
      };
    });

    vi.doMock("@/lib/stripe/checkout", () => ({
      createSubscriptionCheckoutForActor: mocks.checkout ??
        vi.fn(async () => ({
          ok: true,
          url: "https://checkout.stripe.com/c/pay/cs_test_abc",
          requestId: "req-1",
        })),
    }));

    return import("@/lib/auth/sign-up-action");
  }

  const paidInput = {
    displayName: "Ana",
    email: "ana@domain.com",
    password: "senhaforte1",
    planKey: "caminho",
    termsAccepted: true,
    adsContext: {
      advertisingConsent: true,
      eventSourceUrl: "https://amemchat.com.br/cadastro",
      fbp: "fb.1.123",
      fbc: null,
      eventId: "evt-123",
    },
  };

  it("new user + plan + session null → Stripe URL", async () => {
    const checkout = vi.fn(async () => ({
      ok: true,
      url: "https://checkout.stripe.com/c/pay/cs_test_abc",
      requestId: "req-1",
    }));
    const { signUpAction } = await loadPaidSignUp({
      signUp: vi.fn(async () => ({
        data: {
          user: { id: "u-new", email: "ana@domain.com", identities: [{ id: "i1" }] },
          session: null,
        },
        error: null,
      })),
      checkout,
    });

    const result = await signUpAction(paidInput);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.stripeCheckout).toBe(true);
      expect(result.redirectTo).toBe("https://checkout.stripe.com/c/pay/cs_test_abc");
      expect(result.needsEmailConfirmation).toBe(true);
    }
    expect(checkout).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u-new",
        email: "ana@domain.com",
        source: "new_signup",
      }),
      "tok_opaque_1234567890ab",
      paidInput.adsContext,
      expect.any(String),
    );
  });

  it("does not redirect paid funnel to /confira-seu-email", async () => {
    const { signUpAction } = await loadPaidSignUp({
      signUp: vi.fn(async () => ({
        data: {
          user: { id: "u-new", email: "ana@domain.com", identities: [{ id: "i1" }] },
          session: null,
        },
        error: null,
      })),
    });

    const result = await signUpAction(paidInput);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.redirectTo).not.toContain("/confira-seu-email");
    }
  });

  it("existing account + correct password → checkout", async () => {
    const checkout = vi.fn(async () => ({
      ok: true,
      url: "https://checkout.stripe.com/c/pay/cs_test_existing",
      requestId: "req-2",
    }));
    const { signUpAction } = await loadPaidSignUp({
      signUp: vi.fn(async () => ({
        data: { user: null, session: null },
        error: { message: "User already registered", code: "email_exists", status: 422 },
      })),
      signInWithPassword: vi.fn(async () => ({
        data: { user: { id: "u-existing" }, session: { access_token: "t" } },
        error: null,
      })),
      checkout,
    });

    const result = await signUpAction(paidInput);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.stripeCheckout).toBe(true);
      expect(result.redirectTo).toContain("checkout.stripe.com");
    }
  });

  it("existing account + wrong password → actionable message", async () => {
    const { signUpAction } = await loadPaidSignUp({
      signUp: vi.fn(async () => ({
        data: { user: null, session: null },
        error: { message: "User already registered", code: "email_exists", status: 422 },
      })),
      signInWithPassword: vi.fn(async () => ({
        data: { user: null, session: null },
        error: { message: "Invalid", code: "invalid_credentials" },
      })),
    });

    const result = await signUpAction(paidInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("account_exists_actionable");
      expect(result.showLoginCtas).toBe(true);
      expect(result.message).not.toContain("já está cadastrado");
    }
  });

  it("organic signup without plan still goes to check-email", async () => {
    const { signUpAction } = await loadPaidSignUp({
      signUp: vi.fn(async () => ({
        data: {
          user: { id: "u1", identities: [{ id: "i1" }] },
          session: null,
        },
        error: null,
      })),
    });

    const result = await signUpAction({
      displayName: "Ana",
      email: "ana@domain.com",
      password: "senhaforte1",
      termsAccepted: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.redirectTo).toContain("/confira-seu-email");
      expect(result.stripeCheckout).toBeUndefined();
    }
  });

  it("checkout failure returns recoverable error", async () => {
    const { signUpAction } = await loadPaidSignUp({
      signUp: vi.fn(async () => ({
        data: {
          user: { id: "u-new", email: "ana@domain.com", identities: [{ id: "i1" }] },
          session: null,
        },
        error: null,
      })),
      checkout: vi.fn(async () => ({
        ok: false,
        code: "checkout_failed",
        message: safeSignUpMessage("unexpected"),
        requestId: "req-fail",
        ref: "abc12345",
      })),
    });

    const result = await signUpAction(paidInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("checkout_failed");
      expect(result.checkoutRef).toBe("abc12345");
    }
  });
});

describe("paid funnel E2E contract (static)", () => {
  it("comece → cadastro → stripe without email confirm gate", () => {
    const form = readFileSync(
      join(process.cwd(), "src", "components", "auth", "sign-up-form.tsx"),
      "utf8",
    );
    const action = readFileSync(
      join(process.cwd(), "src", "lib", "auth", "sign-up-action.ts"),
      "utf8",
    );
    const checkout = readFileSync(
      join(process.cwd(), "src", "lib", "stripe", "checkout.ts"),
      "utf8",
    );

    expect(form).toContain("Continuar para pagamento seguro");
    expect(form).toContain("window.location.href");
    expect(form).toContain("collectAdsCheckoutContext");
    expect(action).toContain("createSubscriptionCheckoutForActor");
    expect(action).toContain("attemptPaidCheckout");
    expect(checkout).toContain("CheckoutTrustedActor");
    expect(checkout).toContain("createSubscriptionCheckoutForActor");
  });
});
