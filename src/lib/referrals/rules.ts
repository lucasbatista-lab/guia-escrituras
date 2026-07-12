import type {
  ReferralAttribution,
  ReferralRewardStatus,
  ReferralTransitionResult,
} from "./types";

const ALLOWED_TRANSITIONS: Record<
  ReferralRewardStatus,
  ReferralRewardStatus[]
> = {
  attributed: ["first_payment_confirmed", "rejected"],
  first_payment_confirmed: ["second_payment_confirmed", "rejected"],
  second_payment_confirmed: ["reward_pending", "rejected"],
  reward_pending: ["reward_approved", "rejected"],
  reward_approved: ["reward_paid", "rejected"],
  reward_paid: [],
  rejected: [],
};

export function assertNotSelfReferral(
  referrerUserId: string,
  referredUserId: string,
): { ok: boolean; error?: string } {
  if (referrerUserId === referredUserId) {
    return { ok: false, error: "Autoindicação não é permitida." };
  }
  return { ok: true };
}

export function assertNoDuplicateAttribution(
  existingForReferred: ReferralAttribution | null,
): { ok: boolean; error?: string } {
  if (existingForReferred) {
    return {
      ok: false,
      error: "Este usuário já possui uma atribuição de indicação.",
    };
  }
  return { ok: true };
}

export function transitionReferralStatus(
  current: ReferralRewardStatus,
  next: ReferralRewardStatus,
): ReferralTransitionResult {
  const allowed = ALLOWED_TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    return {
      ok: false,
      error: `Transição inválida: ${current} → ${next}`,
    };
  }
  return { ok: true, status: next };
}

/**
 * Recompensa só fica elegível (reward_pending) após a segunda cobrança confirmada.
 */
export function markEligibleAfterSecondPayment(
  current: ReferralRewardStatus,
): ReferralTransitionResult {
  if (current !== "second_payment_confirmed") {
    return {
      ok: false,
      error:
        "A recompensa só fica elegível após a segunda cobrança confirmada.",
    };
  }
  return transitionReferralStatus(current, "reward_pending");
}

export function isRewardEligible(status: ReferralRewardStatus): boolean {
  return (
    status === "reward_pending" ||
    status === "reward_approved" ||
    status === "reward_paid"
  );
}
