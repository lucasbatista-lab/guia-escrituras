import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  checkoutFailureMessage,
  extractSafeStripeErrorDiagnostics,
  mapStripeCheckoutError,
  sanitizeStripeErrorMessage,
  shortCheckoutRef,
} from "@/lib/stripe/checkout-errors";
import { preflightCheckoutPlan } from "@/lib/stripe/checkout-preflight";
import {
  resolveBillingCustomerId,
  type BillingCustomerStore,
  type StripeCustomerApi,
} from "@/lib/stripe/billing-customer";

function read(...parts: string[]) {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

function validPrice(amount: number) {
  return {
    active: true,
    currency: "brl",
    unit_amount: amount,
    type: "recurring",
    recurring: { interval: "month" },
  };
}

describe("checkout failure mapping", () => {
  it("maps price and account errors safely", () => {
    expect(
      mapStripeCheckoutError({
        code: "resource_missing",
        message: "No such price: price_x",
      }).code,
    ).toBe("price_unavailable");
    expect(
      mapStripeCheckoutError({
        message: "No such customer: cus_sand",
      }).code,
    ).toBe("customer_failed");
    expect(
      mapStripeCheckoutError({
        code: "account_invalid",
        message: "Your account is not activated",
      }).code,
    ).toBe("stripe_account_unavailable");
    expect(mapStripeCheckoutError({ statusCode: 429 }).code).toBe(
      "stripe_temporary",
    );
  });

  it("user messages and refs never include secrets or full IDs", () => {
    const msg = checkoutFailureMessage("price_unavailable");
    expect(msg).not.toMatch(/sk_|whsec_|price_|cus_|cs_/);
    expect(shortCheckoutRef("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")).toBe(
      "aaaaaaaa",
    );
  });

  it("preserves safe type/code/param without changing public codes", () => {
    const mapped = mapStripeCheckoutError({
      type: "invalid_request_error",
      code: "parameter_invalid_empty",
      param: "success_url",
      message: "Invalid success_url",
    });
    expect(mapped.code).toBe("checkout_failed");
    expect(mapped.providerCode).toBe("parameter_invalid_empty");
    expect(mapped.stripeType).toBe("invalid_request_error");
    expect(mapped.stripeCode).toBe("parameter_invalid_empty");
    expect(mapped.stripeParam).toBe("success_url");
    expect(checkoutFailureMessage(mapped.code)).toBe(
      "Não foi possível iniciar o pagamento seguro. Tente novamente.",
    );
  });
});

describe("stripe checkout session create diagnostics", () => {
  it("extracts safe Stripe fields from the primary error", () => {
    const diagnostics = extractSafeStripeErrorDiagnostics({
      type: "invalid_request_error",
      rawType: "invalid_request_error",
      code: "url_invalid",
      param: "cancel_url",
      statusCode: 400,
      requestId: "req_diag_123",
      requestLogUrl: "https://dashboard.stripe.com/logs/req_diag_123",
      doc_url: "https://stripe.com/docs/error-codes/url-invalid",
      message: "Not a valid URL",
    });
    expect(diagnostics).toEqual({
      stripe_type: "invalid_request_error",
      stripe_raw_type: "invalid_request_error",
      stripe_code: "url_invalid",
      stripe_param: "cancel_url",
      stripe_status_code: 400,
      stripe_request_id: "req_diag_123",
      stripe_request_log_url: "https://dashboard.stripe.com/logs/req_diag_123",
      stripe_doc_url: "https://stripe.com/docs/error-codes/url-invalid",
      stripe_message_safe: "Not a valid URL",
    });
  });

  it("falls back to error.raw for missing fields", () => {
    const diagnostics = extractSafeStripeErrorDiagnostics({
      message: "wrapper",
      raw: {
        type: "card_error",
        code: "card_declined",
        param: "payment_method",
        status_code: 402,
        request_id: "req_from_raw",
        request_log_url: "https://dashboard.stripe.com/logs/req_from_raw",
        doc_url: "https://stripe.com/docs/error-codes/card-declined",
        message: "Your card was declined.",
      },
    });
    expect(diagnostics.stripe_type).toBe("card_error");
    expect(diagnostics.stripe_code).toBe("card_declined");
    expect(diagnostics.stripe_param).toBe("payment_method");
    expect(diagnostics.stripe_status_code).toBe(402);
    expect(diagnostics.stripe_request_id).toBe("req_from_raw");
    expect(diagnostics.stripe_request_log_url).toContain("req_from_raw");
    expect(diagnostics.stripe_doc_url).toContain("card-declined");
    expect(diagnostics.stripe_message_safe).toBe("wrapper");
  });

  it("sanitizes emails, Stripe IDs, and secrets in messages", () => {
    const sanitized = sanitizeStripeErrorMessage(
      "No such customer: cus_Abc123 for user@example.com with price_Live999 and sk_live_SECRETTOKEN and whsec_abc123",
    );
    expect(sanitized).toBeTruthy();
    expect(sanitized!.length).toBeLessThanOrEqual(300);
    expect(sanitized).toContain("[email]");
    expect(sanitized).toContain("[id]");
    expect(sanitized).toContain("[redacted]");
    expect(sanitized).not.toMatch(/cus_Abc123/);
    expect(sanitized).not.toMatch(/price_Live999/);
    expect(sanitized).not.toMatch(/user@example\.com/);
    expect(sanitized).not.toMatch(/sk_live_/);
    expect(sanitized).not.toMatch(/whsec_/);
  });

  it("masks cs_/sub_/prod_/pm_/pi_/in_/evt_ ids and truncates to 300 chars", () => {
    const long = `cs_test_session sub_123 prod_456 pm_789 pi_abc in_def evt_ghi ${"x".repeat(400)}`;
    const sanitized = sanitizeStripeErrorMessage(long)!;
    expect(sanitized.length).toBe(300);
    expect(sanitized).toContain("[id]");
    expect(sanitized).not.toMatch(/\b(?:cs|sub|prod|pm|pi|in|evt)_[A-Za-z0-9]/);
  });

  it("never registers secrets and keeps public failure message unchanged", () => {
    const diagnostics = extractSafeStripeErrorDiagnostics({
      type: "api_error",
      code: "secret_leak_test",
      message:
        "bad sk_test_51Leak and Bearer tok_abc and email test@amemchat.com.br for cus_secret",
      raw: {
        message: "also whsec_secretvalue",
      },
    });
    expect(diagnostics.stripe_message_safe).not.toMatch(
      /sk_test_|whsec_|Bearer\s|@amemchat|cus_secret/,
    );
    expect(JSON.stringify(diagnostics)).not.toMatch(
      /sk_test_|whsec_|Bearer\s|cus_secret|test@amemchat/,
    );
    expect(checkoutFailureMessage("checkout_failed")).toBe(
      "Não foi possível iniciar o pagamento seguro. Tente novamente.",
    );
  });

  it("does not create Checkout or touch the network", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    extractSafeStripeErrorDiagnostics({
      code: "url_invalid",
      type: "invalid_request_error",
    });
    sanitizeStripeErrorMessage("hello");
    mapStripeCheckoutError({ code: "url_invalid" });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe("checkout preflight (selected plan only)", () => {
  it("accepts a valid live price for Essencial", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_validkey";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_ok";
    process.env.STRIPE_PRICE_ESSENCIAL = "price_essencial_live";
    const result = await preflightCheckoutPlan("essencial", {
      retrievePrice: async () => validPrice(3800),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mode).toBe("live");
      expect(result.priceId).toBe("price_essencial_live");
    }
  });

  it("rejects missing/incompatible price shapes", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_validkey";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_ok";
    process.env.STRIPE_PRICE_ESSENCIAL = "price_essencial_live";

    const missing = await preflightCheckoutPlan("essencial", {
      retrievePrice: async () => {
        throw { code: "resource_missing", message: "No such price" };
      },
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.issue).toBe("price_not_found_in_mode");

    const inactive = await preflightCheckoutPlan("essencial", {
      retrievePrice: async () => ({ ...validPrice(3800), active: false }),
    });
    expect(inactive.ok).toBe(false);
    if (!inactive.ok) expect(inactive.issue).toBe("price_inactive");

    const currency = await preflightCheckoutPlan("essencial", {
      retrievePrice: async () => ({ ...validPrice(3800), currency: "usd" }),
    });
    expect(currency.ok).toBe(false);
    if (!currency.ok) expect(currency.issue).toBe("currency_not_brl");

    const amount = await preflightCheckoutPlan("essencial", {
      retrievePrice: async () => validPrice(999),
    });
    expect(amount.ok).toBe(false);
    if (!amount.ok) expect(amount.issue).toBe("unit_amount_mismatch");

    const recurring = await preflightCheckoutPlan("essencial", {
      retrievePrice: async () => ({
        ...validPrice(3800),
        type: "one_time",
        recurring: null,
      }),
    });
    expect(recurring.ok).toBe(false);
    if (!recurring.ok) expect(recurring.issue).toBe("not_monthly_recurring");
  });

  it("fails closed without webhook secret", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_validkey";
    delete process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_PRICE_ESSENCIAL = "price_essencial_live";
    const result = await preflightCheckoutPlan("essencial", {
      retrievePrice: async () => validPrice(3800),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("config_missing");
      expect(result.issue).toBe("webhook_secret_missing");
    }
  });
});

async function loadCheckoutWithMocks(options: {
  auth?: unknown;
  view?: unknown;
  intent?: unknown;
  stripe: unknown;
  customerId?: string;
  subscriptions?: unknown[];
}) {
  vi.resetModules();

  vi.doMock("@/lib/auth/session", () => ({
    getAuthUserContext: vi.fn(async () => {
      if ("auth" in options) return options.auth;
      return {
        userId: "user-1",
        email: "u@example.com",
        demoMode: false,
        spiritualProfile: { onboardingCompleted: false },
      };
    }),
  }));

  vi.doMock("@/lib/signup-intents", () => ({
    getContinuationViewState: vi.fn(),
    getContinuationViewStateForUser: vi.fn(
      async () =>
        options.view ?? {
          kind: "ready",
          planKey: "essencial",
          intentId: "intent-1",
          intentToken: "tok_opaque_12345678",
        },
    ),
    loadSignupIntentByToken: vi.fn(),
    loadSignupIntentByIdForUser: vi.fn(
      async () =>
        options.intent ?? {
          id: "intent-1",
          userId: "user-1",
          planKey: "essencial",
          status: "pending",
          stripeCheckoutSessionId: null,
        },
    ),
  }));

  vi.doMock("@/lib/supabase/admin", () => ({
    createAdminClient: () => ({
      from: () => ({
        update: () => ({
          eq: async () => ({ error: null }),
        }),
      }),
    }),
  }));

  vi.doMock("@/lib/billing/subscription-lookup", () => ({
    loadUserSubscriptions: vi.fn(async () => options.subscriptions ?? []),
  }));

  vi.doMock("@/lib/stripe/billing-customer", async () => {
    const actual = await vi.importActual<
      typeof import("@/lib/stripe/billing-customer")
    >("@/lib/stripe/billing-customer");
    return {
      ...actual,
      getOrCreateBillingCustomer: vi.fn(
        async () => options.customerId ?? "cus_live_ok",
      ),
    };
  });

  const { setStripeClientForTests } = await import("@/lib/stripe/client");
  setStripeClientForTests(options.stripe as never);

  const { createSubscriptionCheckout } = await import("@/lib/stripe/checkout");
  return { createSubscriptionCheckout, setStripeClientForTests };
}

describe("createSubscriptionCheckout failure handling", () => {
  afterEach(async () => {
    vi.resetModules();
    vi.doUnmock("@/lib/auth/session");
    vi.doUnmock("@/lib/signup-intents");
    vi.doUnmock("@/lib/supabase/admin");
    vi.doUnmock("@/lib/billing/subscription-lookup");
    vi.doUnmock("@/lib/stripe/billing-customer");
    const { setStripeClientForTests } = await import("@/lib/stripe/client");
    setStripeClientForTests(null);
  });

  it("returns typed errors instead of throwing for Stripe failures", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_validkey";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_ok";
    process.env.STRIPE_PRICE_ESSENCIAL = "price_essencial_live";
    process.env.APP_URL = "https://amemchat.com.br";

    const { createSubscriptionCheckout } = await loadCheckoutWithMocks({
      stripe: {
        prices: {
          retrieve: vi.fn(async () => validPrice(3800)),
        },
        checkout: {
          sessions: {
            retrieve: vi.fn(),
            create: vi.fn(async () => {
              throw {
                code: "account_invalid",
                message: "Your account is not activated for charges",
              };
            }),
          },
        },
      },
    });

    const result = await createSubscriptionCheckout(null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("stripe_account_unavailable");
      expect(result.message).not.toMatch(/sk_|account_invalid|cus_/);
      expect(result.ref).toHaveLength(8);
    }
  });

  it("creates checkout when config and customer are valid", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_validkey";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_ok";
    process.env.STRIPE_PRICE_ESSENCIAL = "price_essencial_live";
    process.env.APP_URL = "https://amemchat.com.br";

    const createSession = vi.fn(async (input: Record<string, unknown>) => {
      expect(input.allow_promotion_codes).toBe(true);
      expect(input.mode).toBe("subscription");
      expect(input.client_reference_id).toBe("user-1");
      return {
        id: "cs_live_test",
        url: "https://checkout.stripe.com/c/pay/cs_test_ok",
      };
    });

    const { createSubscriptionCheckout } = await loadCheckoutWithMocks({
      stripe: {
        prices: {
          retrieve: vi.fn(async () => validPrice(3800)),
        },
        checkout: {
          sessions: {
            retrieve: vi.fn(),
            create: createSession,
          },
        },
      },
    });

    const result = await createSubscriptionCheckout(null);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.url).toContain("checkout.stripe.com");
    }
    expect(createSession).toHaveBeenCalledTimes(1);
  });

  it("skips sandbox checkout session and continues", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_validkey";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_ok";
    process.env.STRIPE_PRICE_ESSENCIAL = "price_essencial_live";
    process.env.APP_URL = "https://amemchat.com.br";

    const createSession = vi.fn(async () => ({
      id: "cs_live_new",
      url: "https://checkout.stripe.com/c/pay/cs_live_new",
    }));

    const { createSubscriptionCheckout } = await loadCheckoutWithMocks({
      intent: {
        id: "intent-reuse",
        userId: "user-1",
        planKey: "essencial",
        status: "checkout_created",
        stripeCheckoutSessionId: "cs_test_old_sandbox",
      },
      stripe: {
        prices: {
          retrieve: vi.fn(async () => validPrice(3800)),
        },
        checkout: {
          sessions: {
            retrieve: vi.fn(async () => {
              throw {
                code: "resource_missing",
                message: "No such checkout.session: cs_test_old_sandbox",
              };
            }),
            create: createSession,
          },
        },
      },
    });

    const result = await createSubscriptionCheckout(null);
    expect(result.ok).toBe(true);
    expect(createSession).toHaveBeenCalled();
  });

  it("returns expired without throwing", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_validkey";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_ok";

    const { createSubscriptionCheckout } = await loadCheckoutWithMocks({
      view: { kind: "expired" },
      stripe: {
        prices: { retrieve: vi.fn() },
        checkout: { sessions: { retrieve: vi.fn(), create: vi.fn() } },
      },
    });

    const result = await createSubscriptionCheckout(null);
    expect(result).toMatchObject({ ok: false, code: "expired" });
  });

  it("returns unauthenticated without throwing", async () => {
    const { createSubscriptionCheckout } = await loadCheckoutWithMocks({
      auth: null,
      stripe: {
        prices: { retrieve: vi.fn() },
        checkout: { sessions: { retrieve: vi.fn(), create: vi.fn() } },
      },
    });
    const result = await createSubscriptionCheckout(null);
    expect(result).toMatchObject({ ok: false, code: "unauthenticated" });
  });

  it("returns price_unavailable for sandbox price on live key", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_validkey";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_ok";
    process.env.STRIPE_PRICE_ESSENCIAL = "price_test_sandbox";

    const { createSubscriptionCheckout } = await loadCheckoutWithMocks({
      stripe: {
        prices: {
          retrieve: vi.fn(async () => {
            throw { code: "resource_missing", message: "No such price" };
          }),
        },
        checkout: { sessions: { retrieve: vi.fn(), create: vi.fn() } },
      },
    });

    const result = await createSubscriptionCheckout(null);
    expect(result).toMatchObject({ ok: false, code: "price_unavailable" });
  });
});

describe("customer remap + non-missing errors", () => {
  function memoryStore(seed?: Record<string, string>): BillingCustomerStore {
    const map = new Map(Object.entries(seed ?? {}));
    return {
      async getByUserId(id) {
        return map.get(id) ?? null;
      },
      async insert(userId, stripeCustomerId) {
        if (map.has(userId)) return "conflict";
        map.set(userId, stripeCustomerId);
        return "ok";
      },
      async replaceIfMatches(userId, expectedOldId, newId) {
        if (map.get(userId) !== expectedOldId) return "stale";
        map.set(userId, newId);
        return "ok";
      },
    };
  }

  it("recreates sandbox customer for live key", async () => {
    const create = vi.fn(async () => ({ id: "cus_live_new" }));
    const stripe: StripeCustomerApi = {
      create,
      retrieve: vi.fn(async () => {
        throw { code: "resource_missing", message: "No such customer" };
      }),
    };
    const id = await resolveBillingCustomerId({
      userId: "u1",
      email: null,
      store: memoryStore({ u1: "cus_test_old" }),
      stripe,
    });
    expect(id).toBe("cus_live_new");
  });

  it("does not treat api_error as resource_missing", async () => {
    await expect(
      resolveBillingCustomerId({
        userId: "u1",
        email: null,
        store: memoryStore({ u1: "cus_x" }),
        stripe: {
          create: vi.fn(),
          retrieve: vi.fn(async () => {
            throw { code: "api_error", message: "boom" };
          }),
        },
      }),
    ).rejects.toMatchObject({ code: "api_error" });
  });
});

describe("source contracts — no RSC 500 path", () => {
  it("action catches failures and preserves intent query", () => {
    const action = read("src", "lib", "billing", "checkout-action.ts");
    expect(action).toContain("isNextRedirectError");
    expect(action).toContain("checkout_error");
    expect(action).toContain("intent");
    expect(action).toContain("ref");
    const page = read(
      "src",
      "app",
      "(platform)",
      "assinar",
      "continuar",
      "page.tsx",
    );
    expect(page).toContain("checkout_error");
    expect(page).toContain("checkoutFailureMessage");
    expect(page).toContain("Tentar pagamento novamente");
    expect(page).not.toContain("digest");
    const checkout = read("src", "lib", "stripe", "checkout.ts");
    expect(checkout).toContain("allow_promotion_codes: true");
    expect(checkout).toContain("preflightCheckoutPlan");
    expect(checkout).toContain("assessCheckoutEligibility");
    expect(checkout).toContain("subscription_guard");
    expect(checkout).toContain("stripe_checkout_failed");
    expect(checkout).toContain("stripe_checkout_session_create_rejected");
    expect(checkout).toContain("extractSafeStripeErrorDiagnostics");
  });
});
