import "server-only";

import { getAppUrl } from "@/lib/auth/app-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseSecretKey } from "@/lib/supabase/secret";
import {
  assertNoDuplicateAttribution,
  assertNotSelfReferral,
} from "@/lib/referrals";
import { logger } from "@/lib/logging/logger";
import { persistLegalConsent } from "@/lib/legal/consent";
import { getSignupIntentRepository } from "./repository";
import { validateCheckoutPlan } from "./params";
import {
  generateSignupIntentToken,
  hashSignupIntentToken,
  isSignupIntentExpired,
  signupIntentExpiresAt,
} from "./tokens";
import type {
  CreateSignupIntentInput,
  SignupIntentRecord,
  SignupIntentStatus,
} from "./types";

export class SignupIntentConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SignupIntentConfigError";
  }
}

export function assertSignupIntentBackendConfigured(): void {
  if (!getSupabaseSecretKey()) {
    throw new SignupIntentConfigError(
      "Cadastro com plano indisponível: configure SUPABASE_SECRET_KEY no servidor.",
    );
  }
}

export async function createSignupIntentWithToken(
  input: CreateSignupIntentInput,
): Promise<{ record: SignupIntentRecord; token: string }> {
  assertSignupIntentBackendConfigured();
  const plan = validateCheckoutPlan(input.selectedPlanKey);
  if (!plan.ok) {
    throw new Error(plan.code);
  }

  const token = generateSignupIntentToken();
  const tokenHash = hashSignupIntentToken(token);
  const repo = getSignupIntentRepository();
  const record = await repo.create({
    ...input,
    selectedPlanKey: plan.planKey,
    tokenHash,
    expiresAt: signupIntentExpiresAt(),
  });
  return { record, token };
}

export function getAuthCallbackUrlForIntent(token: string): string {
  const origin = getAppUrl();
  if (!origin) {
    throw new SignupIntentConfigError("APP_URL ou NEXT_PUBLIC_APP_URL ausente.");
  }
  const params = new URLSearchParams({ intent: token });
  return `${origin}/auth/callback?${params.toString()}`;
}

export async function loadSignupIntentByToken(
  token: string,
): Promise<SignupIntentRecord | null> {
  assertSignupIntentBackendConfigured();
  const tokenHash = hashSignupIntentToken(token);
  const repo = getSignupIntentRepository();
  const record = await repo.findByTokenHash(tokenHash);
  if (!record) return null;
  if (isSignupIntentExpired(record.expiresAt)) {
    if (record.status !== "expired" && record.status !== "completed") {
      await repo.update(record.id, { status: "expired" });
    }
    return { ...record, status: "expired" };
  }
  return record;
}

export async function markIntentAwaitingConfirmation(
  intentId: string,
): Promise<void> {
  const repo = getSignupIntentRepository();
  await repo.update(intentId, { status: "awaiting_confirmation" });
}

export async function completeIntentAfterConfirmation(
  token: string,
  userId: string,
  requestId: string,
): Promise<{
  ok: true;
  redirectTo: string;
} | {
  ok: false;
  code: "not_found" | "expired" | "invalid_status" | "wrong_user";
}> {
  const record = await loadSignupIntentByToken(token);
  if (!record) return { ok: false, code: "not_found" };
  if (record.status === "expired" || isSignupIntentExpired(record.expiresAt)) {
    return { ok: false, code: "expired" };
  }

  const allowed: SignupIntentStatus[] = [
    "pending_signup",
    "awaiting_confirmation",
    "ready_for_checkout",
  ];
  if (!allowed.includes(record.status)) {
    return { ok: false, code: "invalid_status" };
  }

  if (record.userId && record.userId !== userId) {
    return { ok: false, code: "wrong_user" };
  }

  const repo = getSignupIntentRepository();
  const updated = await repo.update(record.id, {
    userId,
    status: "ready_for_checkout",
  });

  await createReferralAttributionIfNeeded(updated, userId, requestId);

  if (updated.termsVersion && updated.privacyVersion && updated.termsAcceptedAt) {
    await persistLegalConsent({
      userId,
      termsVersion: updated.termsVersion,
      privacyVersion: updated.privacyVersion,
      acceptedAt: updated.termsAcceptedAt,
      source: "signup_intent_callback",
      requestId,
    });
  }

  return {
    ok: true,
    redirectTo: `/assinar/continuar?intent=${encodeURIComponent(token)}`,
  };
}

async function createReferralAttributionIfNeeded(
  intent: SignupIntentRecord,
  userId: string,
  requestId: string,
): Promise<void> {
  if (!intent.referralCode) return;

  try {
    const admin = createAdminClient();
    const { data: codeRow } = await admin
      .from("referral_codes")
      .select("owner_user_id, active")
      .eq("code", intent.referralCode)
      .eq("active", true)
      .maybeSingle();

    if (!codeRow?.owner_user_id) return;

    const selfCheck = assertNotSelfReferral(codeRow.owner_user_id, userId);
    if (!selfCheck.ok) {
      logger.warn("referral_self_blocked", { requestId, userId });
      return;
    }

    const { data: existing } = await admin
      .from("referral_attributions")
      .select("id")
      .eq("referred_user_id", userId)
      .maybeSingle();

    const dupCheck = assertNoDuplicateAttribution(
      existing
        ? {
            referralCode: intent.referralCode,
            referrerUserId: codeRow.owner_user_id,
            referredUserId: userId,
            status: "attributed",
          }
        : null,
    );
    if (!dupCheck.ok) return;

    await admin.from("referral_attributions").insert({
      referral_code: intent.referralCode,
      referrer_user_id: codeRow.owner_user_id,
      referred_user_id: userId,
      status: "attributed",
    });
  } catch (error) {
    logger.error("referral_attribution_failed", {
      requestId,
      userId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

export type ContinuationViewState =
  | { kind: "ready"; planKey: SignupIntentRecord["selectedPlanKey"]; intentToken: string }
  | { kind: "expired" }
  | { kind: "used" }
  | { kind: "not_found" }
  | { kind: "forbidden" };

export async function getContinuationViewState(
  token: string,
  userId: string,
): Promise<ContinuationViewState> {
  const record = await loadSignupIntentByToken(token);
  if (!record) return { kind: "not_found" };
  if (record.status === "expired" || isSignupIntentExpired(record.expiresAt)) {
    return { kind: "expired" };
  }
  if (record.userId !== userId) return { kind: "forbidden" };
  if (record.status === "completed" || record.status === "checkout_created") {
    return { kind: "used" };
  }
  if (record.status !== "ready_for_checkout") {
    return { kind: "not_found" };
  }
  return {
    kind: "ready",
    planKey: record.selectedPlanKey,
    intentToken: token,
  };
}
