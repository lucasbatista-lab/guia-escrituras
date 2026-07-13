import { describe, expect, it } from "vitest";
import {
  resolveEffectiveSubscription,
  selectEffectiveSubscriptionsByUser,
  type SubscriptionCandidate,
} from "@/lib/billing/effective-subscription";
import { getPlanByKey } from "@/lib/entitlements";

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

describe("resolveEffectiveSubscription", () => {
  it("returns manual subscription when it is the only live one", () => {
    const result = resolveEffectiveSubscription([
      sub({
        id: "1",
        userId: "u1",
        planKey: "profundo",
        status: "active",
      }),
    ]);
    expect(result?.subscription.id).toBe("1");
    expect(result?.hasDuplicates).toBe(false);
  });

  it("prefers Stripe-linked subscription over manual", () => {
    const result = resolveEffectiveSubscription([
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
        planKey: "profundo",
        status: "active",
        stripeSubscriptionId: "sub_123",
        currentPeriodEnd: "2026-08-13T00:00:00.000Z",
        createdAt: "2026-07-13T03:00:00.000Z",
      }),
    ]);
    expect(result?.subscription.id).toBe("stripe");
    expect(result?.hasDuplicates).toBe(true);
  });

  it("among Stripe rows prefers farthest period end", () => {
    const result = resolveEffectiveSubscription([
      sub({
        id: "a",
        userId: "u1",
        planKey: "caminho",
        status: "active",
        stripeSubscriptionId: "sub_a",
        currentPeriodEnd: "2026-08-01T00:00:00.000Z",
      }),
      sub({
        id: "b",
        userId: "u1",
        planKey: "caminho",
        status: "active",
        stripeSubscriptionId: "sub_b",
        currentPeriodEnd: "2026-09-01T00:00:00.000Z",
      }),
    ]);
    expect(result?.subscription.id).toBe("b");
  });

  it("ignores canceled subscriptions", () => {
    const result = resolveEffectiveSubscription([
      sub({
        id: "canceled",
        userId: "u1",
        planKey: "essencial",
        status: "canceled",
        stripeSubscriptionId: "sub_x",
      }),
      sub({
        id: "active",
        userId: "u1",
        planKey: "essencial",
        status: "active",
      }),
    ]);
    expect(result?.subscription.id).toBe("active");
  });
});

describe("MRR without duplication", () => {
  it("counts one effective subscription per user", () => {
    const { effective, usersWithDuplicates } = selectEffectiveSubscriptionsByUser([
      sub({
        id: "manual",
        userId: "u1",
        planKey: "profundo",
        status: "active",
      }),
      sub({
        id: "stripe",
        userId: "u1",
        planKey: "profundo",
        status: "active",
        stripeSubscriptionId: "sub_1",
      }),
      sub({
        id: "other",
        userId: "u2",
        planKey: "caminho",
        status: "active",
        stripeSubscriptionId: "sub_2",
      }),
    ]);

    expect(effective).toHaveLength(2);
    expect(usersWithDuplicates).toBe(1);
    const mrr = effective.reduce(
      (sum, row) => sum + (getPlanByKey(row.planKey)?.priceMonthlyCents ?? 0),
      0,
    );
    expect(mrr).toBe(
      (getPlanByKey("profundo")?.priceMonthlyCents ?? 0) +
        (getPlanByKey("caminho")?.priceMonthlyCents ?? 0),
    );
  });
});

describe("portal availability rule", () => {
  it("portal applies only with billing customer, not bare manual sub", () => {
    const manual = resolveEffectiveSubscription([
      sub({ id: "m", userId: "u", planKey: "profundo", status: "active" }),
    ]);
    expect(manual?.subscription.stripeSubscriptionId).toBeFalsy();

    const stripe = resolveEffectiveSubscription([
      sub({
        id: "s",
        userId: "u",
        planKey: "profundo",
        status: "active",
        stripeSubscriptionId: "sub_1",
      }),
    ]);
    expect(stripe?.subscription.stripeSubscriptionId).toBeTruthy();
  });
});
