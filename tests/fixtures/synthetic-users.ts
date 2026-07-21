/**
 * Synthetic users for real-usage automated tests.
 * No PII; emails use @amemchat.test only.
 */
import type { PlanKey } from "@/lib/entitlements";

export type SyntheticUserId =
  | "syn-anon"
  | "syn-essencial"
  | "syn-caminho"
  | "syn-profundo"
  | "syn-particular"
  | "syn-ended"
  | "syn-admin"
  | "syn-no-onboarding";

export interface SyntheticUserFixture {
  id: SyntheticUserId;
  userId: string;
  email: string | null;
  planKey: PlanKey | null;
  onboardingCompleted: boolean;
  isAdmin: boolean;
  subscriptionStatus: string | null;
}

export const SYNTHETIC_USERS: Record<SyntheticUserId, SyntheticUserFixture> = {
  "syn-anon": {
    id: "syn-anon",
    userId: "00000000-0000-4000-8000-000000000000",
    email: null,
    planKey: null,
    onboardingCompleted: false,
    isAdmin: false,
    subscriptionStatus: null,
  },
  "syn-essencial": {
    id: "syn-essencial",
    userId: "11111111-1111-4111-8111-111111111111",
    email: "essencial@amemchat.test",
    planKey: "essencial",
    onboardingCompleted: true,
    isAdmin: false,
    subscriptionStatus: "active",
  },
  "syn-caminho": {
    id: "syn-caminho",
    userId: "22222222-2222-4222-8222-222222222222",
    email: "caminho@amemchat.test",
    planKey: "caminho",
    onboardingCompleted: true,
    isAdmin: false,
    subscriptionStatus: "active",
  },
  "syn-profundo": {
    id: "syn-profundo",
    userId: "33333333-3333-4333-8333-333333333333",
    email: "profundo@amemchat.test",
    planKey: "profundo",
    onboardingCompleted: true,
    isAdmin: false,
    subscriptionStatus: "active",
  },
  "syn-particular": {
    id: "syn-particular",
    userId: "44444444-4444-4444-8444-444444444444",
    email: "particular@amemchat.test",
    planKey: "particular",
    onboardingCompleted: true,
    isAdmin: false,
    subscriptionStatus: "active",
  },
  "syn-ended": {
    id: "syn-ended",
    userId: "55555555-5555-4555-8555-555555555555",
    email: "ended@amemchat.test",
    planKey: null,
    onboardingCompleted: true,
    isAdmin: false,
    subscriptionStatus: "canceled",
  },
  "syn-admin": {
    id: "syn-admin",
    userId: "66666666-6666-4666-8666-666666666666",
    email: "admin@amemchat.test",
    planKey: "caminho",
    onboardingCompleted: true,
    isAdmin: true,
    subscriptionStatus: "active",
  },
  "syn-no-onboarding": {
    id: "syn-no-onboarding",
    userId: "77777777-7777-4777-8777-777777777777",
    email: "onboarding@amemchat.test",
    planKey: "caminho",
    onboardingCompleted: false,
    isAdmin: false,
    subscriptionStatus: "active",
  },
};

/** Canonical journey used in Caminho real-usage flows. */
export const FIXTURE_JOURNEY_SLUG = "ansiedade-confianca";
