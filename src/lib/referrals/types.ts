export type ReferralRewardStatus =
  | "attributed"
  | "first_payment_confirmed"
  | "second_payment_confirmed"
  | "reward_pending"
  | "reward_approved"
  | "reward_paid"
  | "rejected";

export interface ReferralCode {
  code: string;
  ownerUserId: string;
  active: boolean;
}

export interface ReferralAttribution {
  referralCode: string;
  referrerUserId: string;
  referredUserId: string;
  status: ReferralRewardStatus;
}

export interface ReferralTransitionResult {
  ok: boolean;
  status?: ReferralRewardStatus;
  error?: string;
}
