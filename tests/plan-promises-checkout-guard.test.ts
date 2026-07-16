import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  assessCheckoutEligibility,
  type SubscriptionCandidate,
} from "@/lib/billing";
import { checkoutFailureMessage } from "@/lib/stripe/checkout-errors";
import {
  getStripePriceEnvName,
  getStripePriceIdForPlan,
} from "@/lib/stripe/config";
import { PLAN_DEFINITIONS, getPlanByKey } from "@/lib/entitlements";

const root = process.cwd();

function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

function sub(
  partial: Partial<SubscriptionCandidate> &
    Pick<SubscriptionCandidate, "id" | "userId" | "planKey" | "status">,
): SubscriptionCandidate {
  return {
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    currentPeriodEnd: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...partial,
  };
}

describe("plan promises — catalog honesty", () => {
  it("keeps prices unchanged", () => {
    expect(getPlanByKey("essencial")?.priceMonthlyCents).toBe(3800);
    expect(getPlanByKey("caminho")?.priceMonthlyCents).toBe(5800);
    expect(getPlanByKey("profundo")?.priceMonthlyCents).toBe(18800);
    expect(getPlanByKey("particular")?.priceMonthlyCents).toBe(98800);
  });

  it("Essencial keeps complete honest core", () => {
    const plan = getPlanByKey("essencial")!;
    const active = plan.displayBenefits.join(" ").toLowerCase();
    expect(plan.tagline).toMatch(/regularidade moderada/i);
    expect(active).toMatch(/reflexões personalizadas/);
    expect(active).toMatch(/tradição/);
    expect(active).toMatch(/profundidade/);
    expect(active).toMatch(/memória/);
    expect(active).toMatch(/histórico/);
    expect(active).toMatch(/uso flexível/);
    expect(active).toMatch(/cancelamento/);
    expect(plan.upcomingBenefits).toBeUndefined();
  });

  it("Caminho communicates frequent use and expanded margin", () => {
    const plan = getPlanByKey("caminho")!;
    const active = plan.displayBenefits.join(" ").toLowerCase();
    expect(plan.tagline).toMatch(/várias vezes por semana/i);
    expect(active).toMatch(/tudo do essencial/);
    expect(active).toMatch(/margem/);
    expect(active).toMatch(/frequente/);
    expect(active).not.toMatch(/jornadas de leitura/);
    expect(plan.upcomingBenefits?.some((b) => /jornadas/i.test(b))).toBe(true);
  });

  it("Profundo communicates intensive use without false active deep mode", () => {
    const plan = getPlanByKey("profundo")!;
    const active = plan.displayBenefits.join(" ").toLowerCase();
    expect(plan.tagline).toMatch(/intens/i);
    expect(active).toMatch(/margem/);
    expect(active).not.toMatch(/conversas profundas/);
    expect(active).not.toMatch(/suporte prioritário|suporte prioritario/);
    expect(active).not.toMatch(/áudio|audio/);
    expect(active).not.toMatch(/memória estendida/);
    expect(plan.upcomingBenefits?.some((b) =>
      /resposta aprofundada/i.test(b),
    )).toBe(true);
  });

  it("Particular stays consultative without checkout", () => {
    const plan = getPlanByKey("particular")!;
    expect(plan.ctaType).toBe("request_access");
    expect(plan.ctaLabel).toBe("Solicitar acesso");
    const active = plan.displayBenefits.join(" ").toLowerCase();
    expect(active).not.toMatch(/whatsapp/);
    expect(active).not.toMatch(/concierge/);
    expect(plan.upcomingBenefits?.join(" ")).toMatch(/após alinhamento/i);
  });

  it("separates active and upcoming labels in plan cards", () => {
    const cards = read("src", "components", "marketing", "plan-cards.tsx");
    expect(cards).toContain("Disponível agora");
    expect(cards).toContain("Em desenvolvimento");
  });

  it("uso-justo aligns with moderate/frequent/intensive tiers", () => {
    const uso = read("src", "app", "(marketing)", "uso-justo", "page.tsx");
    expect(uso).toMatch(/uso moderado/i);
    expect(uso).toMatch(/uso frequente/i);
    expect(uso).toMatch(/uso intensivo/i);
    expect(uso).toMatch(/franquia fixa de mensagens/);
  });

  it("does not expose rigid message quotas as promises", () => {
    for (const plan of PLAN_DEFINITIONS) {
      const active = plan.displayBenefits.join(" ").toLowerCase();
      expect(active).not.toMatch(/\d+\s*mensagens/);
      expect(active).not.toMatch(/ilimitado/);
    }
  });
});

describe("plan promises — Stripe price IDs unchanged", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("maps checkout plans to env var names only", () => {
    process.env.STRIPE_PRICE_ESSENCIAL = "price_essencial_unchanged";
    process.env.STRIPE_PRICE_CAMINHO = "price_caminho_unchanged";
    process.env.STRIPE_PRICE_PROFUNDO = "price_profundo_unchanged";
    expect(getStripePriceEnvName("essencial")).toBe("STRIPE_PRICE_ESSENCIAL");
    expect(getStripePriceEnvName("caminho")).toBe("STRIPE_PRICE_CAMINHO");
    expect(getStripePriceEnvName("profundo")).toBe("STRIPE_PRICE_PROFUNDO");
    expect(getStripePriceIdForPlan("essencial")).toBe("price_essencial_unchanged");
    expect(getStripePriceIdForPlan("caminho")).toBe("price_caminho_unchanged");
    expect(getStripePriceIdForPlan("profundo")).toBe("price_profundo_unchanged");
  });
});

describe("checkout guard — assessCheckoutEligibility", () => {
  it("allows checkout when no blocking subscription", () => {
    expect(assessCheckoutEligibility([])).toEqual({ eligible: true });
    expect(
      assessCheckoutEligibility([
        sub({
          id: "1",
          userId: "u1",
          planKey: "essencial",
          status: "canceled",
        }),
      ]),
    ).toEqual({ eligible: true });
  });

  it("blocks active subscriptions", () => {
    const result = assessCheckoutEligibility([
      sub({
        id: "1",
        userId: "u1",
        planKey: "caminho",
        status: "active",
        stripeSubscriptionId: "sub_1",
      }),
    ]);
    expect(result).toEqual({
      eligible: false,
      reason: "existing_subscription",
    });
  });

  it("blocks trialing subscriptions", () => {
    const result = assessCheckoutEligibility([
      sub({
        id: "1",
        userId: "u1",
        planKey: "essencial",
        status: "trialing",
      }),
    ]);
    expect(result.eligible).toBe(false);
  });

  it("blocks cancel_at_period_end users still within active status", () => {
    const result = assessCheckoutEligibility([
      sub({
        id: "1",
        userId: "u1",
        planKey: "profundo",
        status: "active",
        stripeSubscriptionId: "sub_canceling",
        currentPeriodEnd: "2026-08-01T00:00:00.000Z",
      }),
    ]);
    expect(result.eligible).toBe(false);
  });

  it("blocks past_due without creating a second subscription", () => {
    const result = assessCheckoutEligibility([
      sub({
        id: "1",
        userId: "u1",
        planKey: "caminho",
        status: "past_due",
        stripeSubscriptionId: "sub_past_due",
      }),
    ]);
    expect(result).toEqual({
      eligible: false,
      reason: "existing_subscription",
    });
  });
});

describe("checkout guard — createSubscriptionCheckout integration", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
    vi.resetModules();
    vi.doUnmock("@/lib/auth/session");
    vi.doUnmock("@/lib/signup-intents");
    vi.doUnmock("@/lib/supabase/admin");
    vi.doUnmock("@/lib/billing/subscription-lookup");
    vi.doUnmock("@/lib/stripe/billing-customer");
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

  async function loadCheckout(options: {
    subscriptions: SubscriptionCandidate[];
    createSession?: ReturnType<typeof vi.fn>;
  }) {
    vi.resetModules();
    vi.doMock("@/lib/auth/session", () => ({
      getAuthUserContext: vi.fn(async () => ({
        userId: "user-1",
        email: "u@example.com",
        demoMode: false,
        spiritualProfile: { onboardingCompleted: false },
      })),
    }));
    vi.doMock("@/lib/signup-intents", () => ({
      getContinuationViewState: vi.fn(),
      getContinuationViewStateForUser: vi.fn(async () => ({
        kind: "ready",
        planKey: "essencial",
        intentId: "intent-1",
        intentToken: "tok_opaque_12345678",
      })),
      loadSignupIntentByToken: vi.fn(),
      loadSignupIntentByIdForUser: vi.fn(async () => ({
        id: "intent-1",
        userId: "user-1",
        planKey: "essencial",
        status: "pending",
        stripeCheckoutSessionId: null,
      })),
    }));
    vi.doMock("@/lib/supabase/admin", () => ({
      createAdminClient: () => ({
        from: () => ({
          update: () => ({ eq: async () => ({ error: null }) }),
        }),
      }),
    }));
    vi.doMock("@/lib/billing/subscription-lookup", () => ({
      loadUserSubscriptions: vi.fn(async () => options.subscriptions),
    }));
    vi.doMock("@/lib/stripe/billing-customer", async () => {
      const actual = await vi.importActual<
        typeof import("@/lib/stripe/billing-customer")
      >("@/lib/stripe/billing-customer");
      return {
        ...actual,
        getOrCreateBillingCustomer: vi.fn(async () => "cus_live_ok"),
      };
    });

    const createSession =
      options.createSession ??
      vi.fn(async () => ({
        id: "cs_live_test",
        url: "https://checkout.stripe.com/c/pay/cs_test_ok",
      }));

    const { setStripeClientForTests } = await import("@/lib/stripe/client");
    setStripeClientForTests({
      prices: { retrieve: vi.fn(async () => validPrice(3800)) },
      checkout: {
        sessions: { retrieve: vi.fn(), create: createSession },
      },
    } as never);

    const { createSubscriptionCheckout } = await import("@/lib/stripe/checkout");
    return { createSubscriptionCheckout, createSession };
  }

  it("creates checkout when user has no blocking subscription", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_validkey";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_ok";
    process.env.STRIPE_PRICE_ESSENCIAL = "price_essencial_live";
    process.env.APP_URL = "https://amemchat.com.br";

    const { createSubscriptionCheckout, createSession } = await loadCheckout({
      subscriptions: [],
    });
    const result = await createSubscriptionCheckout(null);
    expect(result.ok).toBe(true);
    expect(createSession).toHaveBeenCalledTimes(1);
  });

  it("blocks active subscriber without creating Stripe session", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_validkey";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_ok";
    process.env.STRIPE_PRICE_ESSENCIAL = "price_essencial_live";

    const { createSubscriptionCheckout, createSession } = await loadCheckout({
      subscriptions: [
        sub({
          id: "1",
          userId: "user-1",
          planKey: "caminho",
          status: "active",
          stripeSubscriptionId: "sub_active",
        }),
      ],
    });
    const result = await createSubscriptionCheckout(null);
    expect(result).toMatchObject({
      ok: false,
      code: "existing_subscription",
    });
    if (!result.ok) {
      expect(result.message).toBe(
        checkoutFailureMessage("existing_subscription"),
      );
      expect(result.message).not.toMatch(/sub_|cus_|stripe/i);
    }
    expect(createSession).not.toHaveBeenCalled();
  });

  it("blocks past_due subscriber without creating Stripe session", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_validkey";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_ok";
    process.env.STRIPE_PRICE_ESSENCIAL = "price_essencial_live";

    const { createSubscriptionCheckout, createSession } = await loadCheckout({
      subscriptions: [
        sub({
          id: "1",
          userId: "user-1",
          planKey: "essencial",
          status: "past_due",
          stripeSubscriptionId: "sub_past_due",
        }),
      ],
    });
    const result = await createSubscriptionCheckout(null);
    expect(result).toMatchObject({
      ok: false,
      code: "existing_subscription",
    });
    expect(createSession).not.toHaveBeenCalled();
  });

  it("reuses open session idempotency still applies before duplicate guard on retry", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_validkey";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_ok";
    process.env.STRIPE_PRICE_ESSENCIAL = "price_essencial_live";

    const createSession = vi.fn();
    vi.resetModules();
    vi.doMock("@/lib/auth/session", () => ({
      getAuthUserContext: vi.fn(async () => ({
        userId: "user-1",
        email: "u@example.com",
        demoMode: false,
      })),
    }));
    vi.doMock("@/lib/signup-intents", () => ({
      getContinuationViewState: vi.fn(),
      getContinuationViewStateForUser: vi.fn(async () => ({
        kind: "ready",
        planKey: "essencial",
        intentId: "intent-1",
        intentToken: "tok",
      })),
      loadSignupIntentByToken: vi.fn(),
      loadSignupIntentByIdForUser: vi.fn(async () => ({
        id: "intent-1",
        userId: "user-1",
        planKey: "essencial",
        status: "checkout_created",
        stripeCheckoutSessionId: "cs_open",
      })),
    }));
    vi.doMock("@/lib/supabase/admin", () => ({
      createAdminClient: () => ({
        from: () => ({
          update: () => ({ eq: async () => ({ error: null }) }),
        }),
      }),
    }));
    vi.doMock("@/lib/billing/subscription-lookup", () => ({
      loadUserSubscriptions: vi.fn(async () => []),
    }));
    vi.doMock("@/lib/stripe/billing-customer", async () => {
      const actual = await vi.importActual<
        typeof import("@/lib/stripe/billing-customer")
      >("@/lib/stripe/billing-customer");
      return {
        ...actual,
        getOrCreateBillingCustomer: vi.fn(async () => "cus_ok"),
      };
    });

    const { setStripeClientForTests } = await import("@/lib/stripe/client");
    setStripeClientForTests({
      prices: { retrieve: vi.fn(async () => validPrice(3800)) },
      checkout: {
        sessions: {
          retrieve: vi.fn(async () => ({
            id: "cs_open",
            url: "https://checkout.stripe.com/c/pay/cs_open",
            status: "open",
          })),
          create: createSession,
        },
      },
    } as never);

    const { createSubscriptionCheckout } = await import("@/lib/stripe/checkout");
    const result = await createSubscriptionCheckout(null);
    expect(result.ok).toBe(true);
    expect(createSession).not.toHaveBeenCalled();
  });
});

describe("checkout guard — scope isolation", () => {
  it("does not modify webhook, chat or auth confirm modules", () => {
    const webhook = read("src", "lib", "stripe", "webhook.ts");
    const chat = read("src", "lib", "ai", "chat-service.ts");
    const confirm = read("src", "app", "(auth)", "email-confirmado", "page.tsx");
    expect(webhook).toContain("handleStripeWebhookEvent");
    expect(chat).toContain("preferDeep");
    expect(confirm).toContain("EmailConfirmedExperience");
  });
});
