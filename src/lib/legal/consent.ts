import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logging/logger";

export async function persistLegalConsent(input: {
  userId: string;
  termsVersion: string;
  privacyVersion: string;
  acceptedAt: string;
  source: string;
  requestId?: string;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("legal_consents").upsert(
      {
        user_id: input.userId,
        terms_version: input.termsVersion,
        privacy_version: input.privacyVersion,
        accepted_at: input.acceptedAt,
        source: input.source,
      },
      { onConflict: "user_id,terms_version,privacy_version" },
    );
  } catch (error) {
    logger.error("legal_consent_persist_failed", {
      requestId: input.requestId,
      userId: input.userId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}
