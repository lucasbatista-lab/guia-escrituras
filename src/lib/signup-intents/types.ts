import type { PlanKey } from "@/lib/entitlements";

export type SignupIntentStatus =
  | "pending_signup"
  | "awaiting_confirmation"
  | "ready_for_checkout"
  | "checkout_created"
  | "completed"
  | "canceled"
  | "expired";

export interface SignupIntentRecord {
  id: string;
  tokenHash: string;
  userId: string | null;
  selectedPlanKey: PlanKey;
  referralCode: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  status: SignupIntentStatus;
  termsVersion: string | null;
  privacyVersion: string | null;
  termsAcceptedAt: string | null;
  stripeCheckoutSessionId: string | null;
  checkoutCreatedAt: string | null;
  completedAt: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SignupTrackingParams {
  referralCode?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
}

export interface CreateSignupIntentInput {
  selectedPlanKey: PlanKey;
  userId?: string | null;
  tracking?: SignupTrackingParams;
  termsVersion: string;
  privacyVersion: string;
  termsAcceptedAt: string;
}

export interface SignupIntentRepository {
  create(
    input: CreateSignupIntentInput & { tokenHash: string; expiresAt: string },
  ): Promise<SignupIntentRecord>;
  findByTokenHash(tokenHash: string): Promise<SignupIntentRecord | null>;
  findById(id: string): Promise<SignupIntentRecord | null>;
  findActionableByUserId(userId: string): Promise<SignupIntentRecord[]>;
  findCheckoutCreatedByUserId(userId: string): Promise<SignupIntentRecord[]>;
  /** All intents linked to the owner for data export (includes expired). */
  listByUserId(userId: string): Promise<SignupIntentRecord[]>;
  update(
    id: string,
    patch: Partial<
      Pick<
        SignupIntentRecord,
        | "userId"
        | "status"
        | "termsVersion"
        | "privacyVersion"
        | "termsAcceptedAt"
      >
    >,
  ): Promise<SignupIntentRecord>;
}
