import { afterEach, describe, expect, it, vi } from "vitest";
import { setStripeClientForTests } from "@/lib/stripe/client";
import type Stripe from "stripe";

vi.mock("@/lib/auth/session", () => ({
  getAuthUserContext: vi.fn(),
}));

vi.mock("@/lib/billing/subscription-lookup", () => ({
  getEffectiveSubscriptionForUser: vi.fn(),
}));

import { getAuthUserContext } from "@/lib/auth/session";
import { getEffectiveSubscriptionForUser } from "@/lib/billing/subscription-lookup";
import {
  cancelSubscriptionRenewal,
  reactivateSubscriptionRenewal,
  getAccountBillingView,
} from "@/lib/stripe/subscription-management";

const authUser = {
  userId: "user-1",
  email: "u@example.com",
  demoMode: false,
  planKey: "profundo",
  spiritualProfile: {
    traditionKey: "ecumenical",
    responseStyle: "pastoral",
    preferredDepth: "balanced",
    saintsContentEnabled: false,
    onboardingCompleted: true,
  },
};

function stripeSub(partial: Record<string, unknown>) {
  return {
    id: "sub_1234567890abcdef",
    status: "active",
    cancel_at_period_end: false,
    current_period_end: 1_787_000_000,
    default_payment_method: {
      card: { brand: "visa", last4: "4242" },
    },
    ...partial,
  };
}

describe("native subscription management", () => {
  afterEach(() => {
    setStripeClientForTests(null);
    vi.resetAllMocks();
    delete process.env.STRIPE_SECRET_KEY;
  });

  it("cancels renewal at period end without immediate cancel", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    vi.mocked(getAuthUserContext).mockResolvedValue(authUser as never);
    vi.mocked(getEffectiveSubscriptionForUser).mockResolvedValue({
      subscription: {
        id: "local-1",
        userId: "user-1",
        planKey: "profundo",
        status: "active",
        stripeSubscriptionId: "sub_1234567890abcdef",
        stripeCustomerId: "cus_x",
        currentPeriodEnd: "2026-08-13T00:00:00.000Z",
        createdAt: "2026-07-13T00:00:00.000Z",
      },
      hasDuplicates: false,
      activeCount: 1,
    });

    const retrieve = vi.fn().mockResolvedValue(stripeSub({}));
    const update = vi.fn().mockResolvedValue(
      stripeSub({ cancel_at_period_end: true }),
    );
    const del = vi.fn();
    setStripeClientForTests({
      subscriptions: { retrieve, update, del, cancel: del },
    } as unknown as Stripe);

    const result = await cancelSubscriptionRenewal();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message).toContain("Profundo");
      expect(result.message).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    }
    expect(update).toHaveBeenCalledWith("sub_1234567890abcdef", {
      cancel_at_period_end: true,
    });
    expect(del).not.toHaveBeenCalled();
  });

  it("reactivates renewal while period is still active", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    vi.mocked(getAuthUserContext).mockResolvedValue(authUser as never);
    vi.mocked(getEffectiveSubscriptionForUser).mockResolvedValue({
      subscription: {
        id: "local-1",
        userId: "user-1",
        planKey: "profundo",
        status: "active",
        stripeSubscriptionId: "sub_1234567890abcdef",
        stripeCustomerId: "cus_x",
        currentPeriodEnd: "2026-08-13T00:00:00.000Z",
        createdAt: "2026-07-13T00:00:00.000Z",
      },
      hasDuplicates: false,
      activeCount: 1,
    });

    const retrieve = vi
      .fn()
      .mockResolvedValue(stripeSub({ cancel_at_period_end: true }));
    const update = vi
      .fn()
      .mockResolvedValue(stripeSub({ cancel_at_period_end: false }));
    setStripeClientForTests({
      subscriptions: { retrieve, update },
    } as unknown as Stripe);

    const result = await reactivateSubscriptionRenewal();
    expect(result.ok).toBe(true);
    expect(update).toHaveBeenCalledWith("sub_1234567890abcdef", {
      cancel_at_period_end: false,
    });
  });

  it("rejects unauthenticated users", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    vi.mocked(getAuthUserContext).mockResolvedValue(null);
    const result = await cancelSubscriptionRenewal();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("unauthenticated");
  });

  it("rejects manual subscriptions without Stripe id", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    vi.mocked(getAuthUserContext).mockResolvedValue(authUser as never);
    vi.mocked(getEffectiveSubscriptionForUser).mockResolvedValue({
      subscription: {
        id: "local-manual",
        userId: "user-1",
        planKey: "profundo",
        status: "active",
        stripeSubscriptionId: null,
        stripeCustomerId: null,
        currentPeriodEnd: "2026-08-13T00:00:00.000Z",
        createdAt: "2026-07-13T00:00:00.000Z",
      },
      hasDuplicates: false,
      activeCount: 1,
    });

    const update = vi.fn();
    setStripeClientForTests({
      subscriptions: { retrieve: vi.fn(), update },
    } as unknown as Stripe);

    const result = await cancelSubscriptionRenewal();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("manual_subscription");
    expect(update).not.toHaveBeenCalled();
  });

  it("never accepts a client-supplied subscription id", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    vi.mocked(getAuthUserContext).mockResolvedValue(authUser as never);
    vi.mocked(getEffectiveSubscriptionForUser).mockResolvedValue({
      subscription: {
        id: "local-1",
        userId: "user-1",
        planKey: "profundo",
        status: "active",
        stripeSubscriptionId: "sub_server_owned",
        stripeCustomerId: "cus_x",
        currentPeriodEnd: "2026-08-13T00:00:00.000Z",
        createdAt: "2026-07-13T00:00:00.000Z",
      },
      hasDuplicates: false,
      activeCount: 1,
    });

    const retrieve = vi.fn().mockResolvedValue(
      stripeSub({ id: "sub_server_owned" }),
    );
    const update = vi.fn().mockResolvedValue(
      stripeSub({ id: "sub_server_owned", cancel_at_period_end: true }),
    );
    setStripeClientForTests({
      subscriptions: { retrieve, update },
    } as unknown as Stripe);

    await cancelSubscriptionRenewal();
    expect(update.mock.calls[0]?.[0]).toBe("sub_server_owned");
    expect(JSON.stringify(update.mock.calls)).not.toContain("sub_from_client");
  });

  it("builds account view without exposing Stripe ids", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    vi.mocked(getEffectiveSubscriptionForUser).mockResolvedValue({
      subscription: {
        id: "local-1",
        userId: "user-1",
        planKey: "profundo",
        status: "active",
        stripeSubscriptionId: "sub_secret_id_full",
        stripeCustomerId: "cus_secret_id_full",
        currentPeriodEnd: "2026-08-13T00:00:00.000Z",
        createdAt: "2026-07-13T00:00:00.000Z",
      },
      hasDuplicates: false,
      activeCount: 1,
    });

    setStripeClientForTests({
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue(
          stripeSub({ cancel_at_period_end: false }),
        ),
      },
    } as unknown as Stripe);

    const view = await getAccountBillingView("user-1");
    expect(view).not.toBeNull();
    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain("sub_secret_id_full");
    expect(serialized).not.toContain("cus_secret_id_full");
    expect(serialized).not.toMatch(/\/api\/billing\/portal/);
    expect(view?.planName).toBe("Profundo");
    expect(view?.priceMonthlyLabel).toContain("R$");
    expect(view?.cardLabel).toContain("4242");
    expect(view?.renewsAutomatically).toBe(true);
    expect(view?.statusLabel).toMatch(/Ativa|ativa/i);
  });
});

describe("checkout still creates recurring subscriptions", () => {
  it("uses mode subscription and pt-BR locale in create payload shape", async () => {
    // Static source contract: locale and mode remain on the checkout call.
    const fs = await import("node:fs/promises");
    const src = await fs.readFile(
      new URL("../src/lib/stripe/checkout.ts", import.meta.url),
      "utf8",
    );
    expect(src).toContain('mode: "subscription"');
    expect(src).toContain('locale: "pt-BR"');
  });
});

describe("conta UI no longer links to Customer Portal", () => {
  it("page source has no portal CTA", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile(
      new URL("../src/app/(platform)/conta/page.tsx", import.meta.url),
      "utf8",
    );
    expect(src).not.toContain("/api/billing/portal");
    expect(src).not.toContain("Gerenciar assinatura");
    expect(src).not.toContain("Customer Portal");
    expect(src).toContain("SubscriptionManagementPanel");
    expect(src).toContain("Valor mensal");
    expect(src).toContain("renovação é automática");
  });
});
