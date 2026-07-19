import { describe, expect, it, afterEach } from "vitest";
import { snapshotEnv, restoreEnv } from "./helpers/env";
import {
  getStripePriceIdForPlan,
  StripeConfigError,
  mapStripeSubscriptionStatus,
} from "@/lib/stripe";
import { transitionReferralStatus } from "@/lib/referrals";
import { PLAN_DEFINITIONS } from "@/lib/entitlements";

describe("stripe config", () => {
  const original = snapshotEnv();

  afterEach(() => {
    restoreEnv(original);
  });

  it("maps plan keys to env price IDs", () => {
    process.env.STRIPE_PRICE_ESSENCIAL = "price_essencial";
    process.env.STRIPE_PRICE_CAMINHO = "price_caminho";
    process.env.STRIPE_PRICE_PROFUNDO = "price_profundo";
    expect(getStripePriceIdForPlan("essencial")).toBe("price_essencial");
    expect(getStripePriceIdForPlan("caminho")).toBe("price_caminho");
  });

  it("rejects particular plan checkout", () => {
    expect(() => getStripePriceIdForPlan("particular")).toThrow(StripeConfigError);
  });

  it("fails clearly when price env missing", () => {
    delete process.env.STRIPE_PRICE_ESSENCIAL;
    expect(() => getStripePriceIdForPlan("essencial")).toThrow(/STRIPE_PRICE_ESSENCIAL/);
  });
});

describe("mapStripeSubscriptionStatus", () => {
  it("maps active and canceled", () => {
    expect(mapStripeSubscriptionStatus("active")).toBe("active");
    expect(mapStripeSubscriptionStatus("canceled")).toBe("canceled");
    expect(mapStripeSubscriptionStatus("past_due")).toBe("past_due");
  });
});

describe("referral billing transitions", () => {
  it("moves to first payment then second and reward pending", () => {
    const first = transitionReferralStatus("attributed", "first_payment_confirmed");
    expect(first.ok).toBe(true);
    const second = transitionReferralStatus(
      "first_payment_confirmed",
      "second_payment_confirmed",
    );
    expect(second.ok).toBe(true);
    const reward = transitionReferralStatus(
      "second_payment_confirmed",
      "reward_pending",
    );
    expect(reward.ok).toBe(true);
  });

  it("does not skip second payment for reward", () => {
    const reward = transitionReferralStatus("attributed", "reward_pending");
    expect(reward.ok).toBe(false);
  });
});

describe("no trial or free plan", () => {
  it("catalog has no free plan and paid prices only", () => {
    expect(PLAN_DEFINITIONS.some((p) => p.key === "free")).toBe(false);
    expect(PLAN_DEFINITIONS.every((p) => p.priceMonthlyCents > 0)).toBe(true);
  });
});

describe("stripe webhook signature", () => {
  const original = snapshotEnv();

  afterEach(() => {
    restoreEnv(original);
  });

  it("rejects missing signature at route level", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    process.env.STRIPE_SECRET_KEY = "sk_test";
    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const req = new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: "{}",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

