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

/** @deprecated Prefer getAuthConfirmUrlForIntent — kept for old links / tests. */
export function getAuthCallbackUrlForIntent(token: string): string {
  const origin = getAppUrl();
  if (!origin) {
    throw new SignupIntentConfigError("APP_URL ou NEXT_PUBLIC_APP_URL ausente.");
  }
  const params = new URLSearchParams({ intent: token });
  return `${origin}/auth/callback?${params.toString()}`;
}

/**
 * Canonical email confirmation redirect (domain + query).
 * Supabase template must append &token_hash=&type=email to RedirectTo.
 */
export function getAuthConfirmUrlForIntent(
  token: string,
  nextPath = "/email-confirmado",
): string {
  const origin = getAppUrl();
  if (!origin) {
    throw new SignupIntentConfigError("APP_URL ou NEXT_PUBLIC_APP_URL ausente.");
  }
  const next = nextPath.startsWith("/") ? nextPath : "/email-confirmado";
  const params = new URLSearchParams({
    intent: token,
    next,
  });
  return `${origin}/auth/confirm?${params.toString()}`;
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

/**
 * Bind intent to a newly created user while status stays awaiting_confirmation.
 * Only call when signUp returned a real new identity (not obfuscated duplicate).
 */
export async function associateIntentUserAwaitingConfirmation(
  intentId: string,
  userId: string,
): Promise<SignupIntentRecord> {
  const repo = getSignupIntentRepository();
  const current = await repo.findById(intentId);
  if (!current) {
    throw new Error("signup_intent_not_found");
  }
  if (current.userId && current.userId !== userId) {
    throw new Error("signup_intent_wrong_user");
  }
  return repo.update(intentId, {
    userId,
    status: "awaiting_confirmation",
  });
}

/**
 * Latest non-expired actionable intent for this user only.
 * Priority: ready_for_checkout, then awaiting_confirmation.
 */
export async function findLatestActionableIntentByUserId(
  userId: string,
): Promise<SignupIntentRecord | null> {
  assertSignupIntentBackendConfigured();
  const repo = getSignupIntentRepository();
  const rows = await repo.findActionableByUserId(userId);
  const fresh = rows.filter(
    (r) =>
      r.userId === userId &&
      !isSignupIntentExpired(r.expiresAt) &&
      r.status !== "expired" &&
      r.status !== "completed" &&
      r.status !== "canceled",
  );
  const ready = fresh.find((r) => r.status === "ready_for_checkout");
  if (ready) return ready;
  const awaiting = fresh.find((r) => r.status === "awaiting_confirmation");
  return awaiting ?? null;
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
  code:
    | "not_found"
    | "expired"
    | "invalid_status"
    | "wrong_user"
    | "missing_consent_data"
    | "consent_failed"
    | "already_ready";
}> {
  const record = await loadSignupIntentByToken(token);
  if (!record) return { ok: false, code: "not_found" };
  if (record.status === "expired" || isSignupIntentExpired(record.expiresAt)) {
    return { ok: false, code: "expired" };
  }

  // Idempotent: already completed association for this user.
  if (record.status === "ready_for_checkout" && record.userId === userId) {
    return {
      ok: true,
      redirectTo: `/email-confirmado?intent=${encodeURIComponent(token)}`,
    };
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

  if (!record.termsVersion || !record.privacyVersion || !record.termsAcceptedAt) {
    logger.error("signup_intent_missing_legal_versions", {
      requestId,
      userId,
      intentId: record.id,
    });
    return { ok: false, code: "missing_consent_data" };
  }

  const repo = getSignupIntentRepository();
  const updated = await repo.update(record.id, {
    userId,
    status: "ready_for_checkout",
  });

  await createReferralAttributionIfNeeded(updated, userId, requestId);

  try {
    await persistLegalConsent({
      userId,
      termsVersion: updated.termsVersion!,
      privacyVersion: updated.privacyVersion!,
      acceptedAt: updated.termsAcceptedAt!,
      source: "signup_intent_callback",
      requestId,
    });
  } catch {
    return { ok: false, code: "consent_failed" };
  }

  return {
    ok: true,
    redirectTo: `/email-confirmado?intent=${encodeURIComponent(token)}`,
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
  | { kind: "ready"; planKey: SignupIntentRecord["selectedPlanKey"]; intentToken: string | null; intentId: string }
  | { kind: "expired" }
  | { kind: "used" }
  | { kind: "not_found" }
  | { kind: "forbidden" };

function toReadyState(
  record: SignupIntentRecord,
  intentToken: string | null,
): ContinuationViewState {
  return {
    kind: "ready",
    planKey: record.selectedPlanKey,
    intentToken,
    intentId: record.id,
  };
}

export async function getContinuationViewState(
  token: string,
  userId: string,
): Promise<ContinuationViewState> {
  const record = await loadSignupIntentByToken(token);
  if (!record) return { kind: "not_found" };
  if (record.status === "expired" || isSignupIntentExpired(record.expiresAt)) {
    return { kind: "expired" };
  }
  if (record.userId && record.userId !== userId) return { kind: "forbidden" };
  if (record.status === "completed" || record.status === "checkout_created") {
    return { kind: "used" };
  }
  if (record.status !== "ready_for_checkout") {
    return { kind: "not_found" };
  }
  return toReadyState(record, token);
}

/** Resume checkout when authenticated user has an actionable intent and no token in URL. */
export async function getContinuationViewStateForUser(
  userId: string,
): Promise<ContinuationViewState> {
  const record = await findLatestActionableIntentByUserId(userId);
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
  return toReadyState(record, null);
}

export async function loadSignupIntentByIdForUser(
  intentId: string,
  userId: string,
): Promise<SignupIntentRecord | null> {
  assertSignupIntentBackendConfigured();
  const repo = getSignupIntentRepository();
  const record = await repo.findById(intentId);
  if (!record) return null;
  if (record.userId !== userId) return null;
  if (isSignupIntentExpired(record.expiresAt)) {
    if (record.status !== "expired" && record.status !== "completed") {
      await repo.update(record.id, { status: "expired" });
    }
    return { ...record, status: "expired" };
  }
  return record;
}
