import { describe, expect, it } from "vitest";
import {
  assertNotSelfReferral,
  assertNoDuplicateAttribution,
  isRewardEligible,
  markEligibleAfterSecondPayment,
  transitionReferralStatus,
} from "@/lib/referrals";

describe("referral eligibility", () => {
  it("prevents self-referral", () => {
    expect(assertNotSelfReferral("u1", "u1").ok).toBe(false);
    expect(assertNotSelfReferral("u1", "u2").ok).toBe(true);
  });

  it("prevents duplicate attribution", () => {
    expect(
      assertNoDuplicateAttribution({
        referralCode: "ABC",
        referrerUserId: "a",
        referredUserId: "b",
        status: "attributed",
      }).ok,
    ).toBe(false);
    expect(assertNoDuplicateAttribution(null).ok).toBe(true);
  });

  it("only becomes eligible after second payment", () => {
    expect(markEligibleAfterSecondPayment("first_payment_confirmed").ok).toBe(
      false,
    );
    const eligible = markEligibleAfterSecondPayment("second_payment_confirmed");
    expect(eligible.ok).toBe(true);
    expect(eligible.status).toBe("reward_pending");
    expect(isRewardEligible("reward_pending")).toBe(true);
  });

  it("follows status machine", () => {
    expect(transitionReferralStatus("attributed", "first_payment_confirmed").ok).toBe(
      true,
    );
    expect(transitionReferralStatus("attributed", "reward_paid").ok).toBe(false);
  });
});
