import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  CreateSignupIntentInput,
  SignupIntentRecord,
  SignupIntentRepository,
  SignupIntentStatus,
} from "./types";

function mapRow(row: Record<string, unknown>): SignupIntentRecord {
  return {
    id: row.id as string,
    tokenHash: row.token_hash as string,
    userId: (row.user_id as string | null) ?? null,
    selectedPlanKey: row.selected_plan_key as SignupIntentRecord["selectedPlanKey"],
    referralCode: (row.referral_code as string | null) ?? null,
    utmSource: (row.utm_source as string | null) ?? null,
    utmMedium: (row.utm_medium as string | null) ?? null,
    utmCampaign: (row.utm_campaign as string | null) ?? null,
    utmContent: (row.utm_content as string | null) ?? null,
    utmTerm: (row.utm_term as string | null) ?? null,
    status: row.status as SignupIntentStatus,
    termsVersion: (row.terms_version as string | null) ?? null,
    privacyVersion: (row.privacy_version as string | null) ?? null,
    termsAcceptedAt: (row.terms_accepted_at as string | null) ?? null,
    expiresAt: row.expires_at as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

class SupabaseSignupIntentRepository implements SignupIntentRepository {
  async create(
    input: CreateSignupIntentInput & { tokenHash: string; expiresAt: string },
  ) {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("signup_intents")
      .insert({
        token_hash: input.tokenHash,
        user_id: input.userId ?? null,
        selected_plan_key: input.selectedPlanKey,
        referral_code: input.tracking?.referralCode ?? null,
        utm_source: input.tracking?.utmSource ?? null,
        utm_medium: input.tracking?.utmMedium ?? null,
        utm_campaign: input.tracking?.utmCampaign ?? null,
        utm_content: input.tracking?.utmContent ?? null,
        utm_term: input.tracking?.utmTerm ?? null,
        status: input.userId ? "ready_for_checkout" : "pending_signup",
        terms_version: input.termsVersion,
        privacy_version: input.privacyVersion,
        terms_accepted_at: input.termsAcceptedAt,
        expires_at: input.expiresAt,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "signup_intent_create_failed");
    }
    return mapRow(data);
  }

  async findByTokenHash(tokenHash: string) {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("signup_intents")
      .select("*")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapRow(data) : null;
  }

  async findById(id: string) {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("signup_intents")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapRow(data) : null;
  }

  async update(
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
  ) {
    const admin = createAdminClient();
    const row: Record<string, unknown> = {};
    if (patch.userId !== undefined) row.user_id = patch.userId;
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.termsVersion !== undefined) row.terms_version = patch.termsVersion;
    if (patch.privacyVersion !== undefined) row.privacy_version = patch.privacyVersion;
    if (patch.termsAcceptedAt !== undefined) {
      row.terms_accepted_at = patch.termsAcceptedAt;
    }

    const { data, error } = await admin
      .from("signup_intents")
      .update(row)
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "signup_intent_update_failed");
    return mapRow(data);
  }
}

let overrideRepo: SignupIntentRepository | null = null;

export function setSignupIntentRepositoryForTests(
  repo: SignupIntentRepository | null,
): void {
  overrideRepo = repo;
}

export function getSignupIntentRepository(): SignupIntentRepository {
  if (overrideRepo) return overrideRepo;
  return new SupabaseSignupIntentRepository();
}
