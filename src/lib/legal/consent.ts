import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logging/logger";

export class LegalConsentError extends Error {
  constructor(
    message: string,
    public readonly code: "persist_failed" | "missing_versions" = "persist_failed",
  ) {
    super(message);
    this.name = "LegalConsentError";
  }
}

export interface LegalConsentRecord {
  userId: string;
  termsVersion: string;
  privacyVersion: string;
  acceptedAt: string;
  source: string;
  createdAt?: string | null;
}

export interface LegalConsentRepository {
  find(
    userId: string,
    termsVersion: string,
    privacyVersion: string,
  ): Promise<LegalConsentRecord | null>;
  upsert(input: LegalConsentRecord): Promise<void>;
  /** All consents for the owner, accepted_at ASC. */
  listByUserId(userId: string): Promise<LegalConsentRecord[]>;
}

class SupabaseLegalConsentRepository implements LegalConsentRepository {
  async find(
    userId: string,
    termsVersion: string,
    privacyVersion: string,
  ): Promise<LegalConsentRecord | null> {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("legal_consents")
      .select("user_id, terms_version, privacy_version, accepted_at, source")
      .eq("user_id", userId)
      .eq("terms_version", termsVersion)
      .eq("privacy_version", privacyVersion)
      .maybeSingle();

    if (error) {
      throw new LegalConsentError(error.message);
    }
    if (!data) return null;
    return {
      userId: data.user_id as string,
      termsVersion: data.terms_version as string,
      privacyVersion: data.privacy_version as string,
      acceptedAt: data.accepted_at as string,
      source: data.source as string,
    };
  }

  async listByUserId(userId: string): Promise<LegalConsentRecord[]> {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("legal_consents")
      .select(
        "user_id, terms_version, privacy_version, accepted_at, source, created_at",
      )
      .eq("user_id", userId)
      .order("accepted_at", { ascending: true });

    if (error) {
      throw new LegalConsentError(error.message);
    }

    return (data ?? []).map((row) => ({
      userId: row.user_id as string,
      termsVersion: row.terms_version as string,
      privacyVersion: row.privacy_version as string,
      acceptedAt: row.accepted_at as string,
      source: row.source as string,
      createdAt: (row.created_at as string | null) ?? null,
    }));
  }

  async upsert(input: LegalConsentRecord): Promise<void> {
    const admin = createAdminClient();
    const { error } = await admin.from("legal_consents").upsert(
      {
        user_id: input.userId,
        terms_version: input.termsVersion,
        privacy_version: input.privacyVersion,
        accepted_at: input.acceptedAt,
        source: input.source,
      },
      {
        onConflict: "user_id,terms_version,privacy_version",
        ignoreDuplicates: true,
      },
    );

    if (error) {
      throw new LegalConsentError(error.message);
    }
  }
}

let overrideRepo: LegalConsentRepository | null = null;

export function setLegalConsentRepositoryForTests(
  repo: LegalConsentRepository | null,
): void {
  overrideRepo = repo;
}

export function getLegalConsentRepository(): LegalConsentRepository {
  if (overrideRepo) return overrideRepo;
  return new SupabaseLegalConsentRepository();
}

/**
 * Persists legal consent via trusted admin client.
 * Idempotent on (user_id, terms_version, privacy_version).
 * Throws LegalConsentError on failure — callers must not swallow.
 */
export async function persistLegalConsent(input: {
  userId: string;
  termsVersion: string | null | undefined;
  privacyVersion: string | null | undefined;
  acceptedAt: string | null | undefined;
  source: string;
  requestId?: string;
}): Promise<"created" | "already_exists"> {
  if (!input.termsVersion?.trim() || !input.privacyVersion?.trim()) {
    logger.error("legal_consent_missing_versions", {
      requestId: input.requestId,
      userId: input.userId,
      hasTerms: Boolean(input.termsVersion),
      hasPrivacy: Boolean(input.privacyVersion),
    });
    throw new LegalConsentError(
      "Versões jurídicas ausentes no intent.",
      "missing_versions",
    );
  }

  if (!input.acceptedAt) {
    logger.error("legal_consent_missing_accepted_at", {
      requestId: input.requestId,
      userId: input.userId,
    });
    throw new LegalConsentError(
      "Aceite de termos ausente no intent.",
      "missing_versions",
    );
  }

  const repo = getLegalConsentRepository();

  try {
    const existing = await repo.find(
      input.userId,
      input.termsVersion,
      input.privacyVersion,
    );
    if (existing) {
      return "already_exists";
    }

    await repo.upsert({
      userId: input.userId,
      termsVersion: input.termsVersion,
      privacyVersion: input.privacyVersion,
      acceptedAt: input.acceptedAt,
      source: input.source,
    });

    logger.info("legal_consent_persisted", {
      requestId: input.requestId,
      userId: input.userId,
      termsVersion: input.termsVersion,
      privacyVersion: input.privacyVersion,
      source: input.source,
    });

    return "created";
  } catch (error) {
    if (error instanceof LegalConsentError) {
      logger.error("legal_consent_persist_failed", {
        requestId: input.requestId,
        userId: input.userId,
        code: error.code,
        error: error.message,
      });
      throw error;
    }
    logger.error("legal_consent_persist_failed", {
      requestId: input.requestId,
      userId: input.userId,
      error: error instanceof Error ? error.message : "unknown",
    });
    throw new LegalConsentError(
      error instanceof Error ? error.message : "persist_failed",
    );
  }
}
