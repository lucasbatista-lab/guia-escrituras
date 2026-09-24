import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resolveEffectiveAccess,
  resolveEffectiveAccessFromSubscriptions,
  subscriptionCandidateToAccess,
  type AccessCandidate,
} from "@/lib/billing/access";
import {
  planAccessRank,
  deriveBillingProvider,
} from "@/lib/billing/providers";
import {
  planKeyFromAppleProductId,
  getConfiguredAppleProductId,
  getAppleProductEnvName,
  APPLE_SUBSCRIPTION_GROUP_RECOMMENDATION,
} from "@/lib/billing/apple-products";
import {
  composeRecurringBillingStops,
  appleRecurringBillingStopStub,
  type RecurringBillingStopPort,
} from "@/lib/billing/recurring-billing-stop";
import type { SubscriptionCandidate } from "@/lib/billing/effective-subscription";
import { resolveEntitlements } from "@/lib/entitlements";

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

function access(
  partial: Partial<AccessCandidate> &
    Pick<AccessCandidate, "provider" | "planKey" | "status">,
): AccessCandidate {
  return {
    currentPeriodEnd: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...partial,
  };
}

describe("provider-neutral access layer", () => {
  it("FREE when no live candidates", () => {
    const result = resolveEffectiveAccess([
      access({
        provider: "stripe",
        planKey: "caminho",
        status: "canceled",
      }),
    ]);
    expect(result.planKey).toBeNull();
    expect(result.entitlements).toEqual([]);
    expect(result.accessSource).toBeNull();
  });

  it("maps Stripe Essencial/Caminho/Profundo entitlements via shared resolveEntitlements", () => {
    for (const planKey of ["essencial", "caminho", "profundo"] as const) {
      const result = resolveEffectiveAccess([
        access({ provider: "stripe", planKey, status: "active" }),
      ]);
      expect(result.planKey).toBe(planKey);
      expect(result.entitlements).toEqual(
        resolveEntitlements({ planKey }).entitlements,
      );
      expect(result.accessSource).toBe("stripe");
    }
  });

  it("trialing grants access like active", () => {
    const result = resolveEffectiveAccess([
      access({
        provider: "stripe",
        planKey: "essencial",
        status: "trialing",
      }),
    ]);
    expect(result.planKey).toBe("essencial");
  });

  it("past_due does not grant access (current Stripe policy)", () => {
    const result = resolveEffectiveAccess([
      access({
        provider: "stripe",
        planKey: "profundo",
        status: "past_due",
      }),
    ]);
    expect(result.planKey).toBeNull();
  });

  it("cancel_at_period_end-but-active still grants while status is active", () => {
    // cancel_at_period_end is not a DB status — access follows live status.
    const result = resolveEffectiveAccess([
      access({
        provider: "stripe",
        planKey: "caminho",
        status: "active",
        currentPeriodEnd: "2026-12-01T00:00:00.000Z",
      }),
    ]);
    expect(result.planKey).toBe("caminho");
  });
});

describe("Stripe resolution parity via subscription rows", () => {
  it("prefers Stripe-linked over manual (unchanged historical rule)", () => {
    const result = resolveEffectiveAccessFromSubscriptions([
      sub({
        id: "manual",
        userId: "u1",
        planKey: "profundo",
        status: "active",
        createdAt: "2026-07-13T00:00:00.000Z",
      }),
      sub({
        id: "stripe",
        userId: "u1",
        planKey: "essencial",
        status: "active",
        stripeSubscriptionId: "sub_123",
        currentPeriodEnd: "2026-08-13T00:00:00.000Z",
        createdAt: "2026-07-13T03:00:00.000Z",
      }),
    ]);
    // Historical rule: stripe link wins even if manual has higher plan.
    expect(result.planKey).toBe("essencial");
    expect(result.accessSource).toBe("stripe");
    expect(result.hasDuplicates).toBe(true);
  });

  it("deriveBillingProvider marks manual when no stripe id", () => {
    expect(deriveBillingProvider({})).toBe("manual");
    expect(
      deriveBillingProvider({ stripeSubscriptionId: "sub_x" }),
    ).toBe("stripe");
    expect(subscriptionCandidateToAccess(sub({
      id: "1",
      userId: "u",
      planKey: "caminho",
      status: "active",
      stripeSubscriptionId: "sub_1",
    })).provider).toBe("stripe");
  });
});

describe("multi-provider ACCESS policy (highest valid plan)", () => {
  it("Apple Profundo + Stripe Essencial → Profundo access, both billing sources", () => {
    const result = resolveEffectiveAccess([
      access({
        provider: "stripe",
        planKey: "essencial",
        status: "active",
        externalSubscriptionId: "sub_stripe",
      }),
      access({
        provider: "apple",
        planKey: "profundo",
        status: "active",
        externalSubscriptionId: "100000012345",
      }),
    ]);
    expect(result.planKey).toBe("profundo");
    expect(result.accessSource).toBe("apple");
    expect(result.billingSources.sort()).toEqual(["apple", "stripe"]);
    expect(result.multiProvider).toBe(true);
    expect(result.entitlements).toContain("chat_deep");
  });

  it("Stripe Caminho + Apple Essencial → Caminho", () => {
    const result = resolveEffectiveAccess([
      access({ provider: "apple", planKey: "essencial", status: "active" }),
      access({ provider: "stripe", planKey: "caminho", status: "active" }),
    ]);
    expect(result.planKey).toBe("caminho");
    expect(result.accessSource).toBe("stripe");
  });

  it("expired Apple does not grant; Stripe active remains", () => {
    const result = resolveEffectiveAccess([
      access({ provider: "apple", planKey: "profundo", status: "canceled" }),
      access({ provider: "stripe", planKey: "essencial", status: "active" }),
    ]);
    expect(result.planKey).toBe("essencial");
    expect(result.accessSource).toBe("stripe");
  });

  it("invalid / unpaid provider state does not accidentally grant", () => {
    const result = resolveEffectiveAccess([
      access({ provider: "apple", planKey: "profundo", status: "unpaid" }),
      access({ provider: "stripe", planKey: "caminho", status: "incomplete" }),
    ]);
    expect(result.planKey).toBeNull();
  });

  it("planAccessRank orders Essencial < Caminho < Profundo", () => {
    expect(planAccessRank("essencial")).toBeLessThan(planAccessRank("caminho"));
    expect(planAccessRank("caminho")).toBeLessThan(planAccessRank("profundo"));
  });
});

describe("Apple product mapping placeholders", () => {
  afterEach(() => {
    delete process.env.APPLE_PRODUCT_ESSENCIAL;
    delete process.env.APPLE_PRODUCT_CAMINHO;
    delete process.env.APPLE_PRODUCT_PROFUNDO;
  });

  it("maps configured product ids to plan keys", () => {
    process.env.APPLE_PRODUCT_ESSENCIAL = "br.com.amemchat.essencial.monthly";
    process.env.APPLE_PRODUCT_CAMINHO = "br.com.amemchat.caminho.monthly";
    process.env.APPLE_PRODUCT_PROFUNDO = "br.com.amemchat.profundo.monthly";

    expect(planKeyFromAppleProductId("br.com.amemchat.caminho.monthly")).toBe(
      "caminho",
    );
    expect(getConfiguredAppleProductId("profundo")).toBe(
      "br.com.amemchat.profundo.monthly",
    );
    expect(getAppleProductEnvName("essencial")).toBe("APPLE_PRODUCT_ESSENCIAL");
    expect(planKeyFromAppleProductId("unknown.product")).toBeNull();
  });

  it("documents single subscription group recommendation", () => {
    expect(APPLE_SUBSCRIPTION_GROUP_RECOMMENDATION.tiers).toEqual([
      "essencial",
      "caminho",
      "profundo",
    ]);
  });
});

describe("account deletion billing stop composition", () => {
  it("aggregates successful ports", async () => {
    const stripe: RecurringBillingStopPort = {
      async stopForUser() {
        return { ok: true, stoppedCount: 1, alreadyStoppedCount: 0 };
      },
    };
    const result = await composeRecurringBillingStops("user-1", [
      stripe,
      appleRecurringBillingStopStub,
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.stoppedCount).toBe(1);
    }
  });

  it("aborts when a port fails (no Auth wipe precondition)", async () => {
    const failing: RecurringBillingStopPort = {
      async stopForUser() {
        return {
          ok: false,
          code: "subscription_cancel_failed",
          message: "fail",
        };
      },
    };
    const later = vi.fn(async () => ({
      ok: true as const,
      stoppedCount: 9,
      alreadyStoppedCount: 0,
    }));
    const result = await composeRecurringBillingStops("user-1", [
      failing,
      { stopForUser: later },
    ]);
    expect(result.ok).toBe(false);
    expect(later).not.toHaveBeenCalled();
  });
});
