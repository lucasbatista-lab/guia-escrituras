import "server-only";

import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { sanitizeReferralCodeForShare } from "@/lib/share/url";

const MAX_INSERT_ATTEMPTS = 4;

function generateReferralCodeCandidate(): string {
  // 10 hex chars — no user_id/email; fits REF_MAX_LEN and URL-safe.
  return randomBytes(5).toString("hex");
}

/**
 * Return the user's active referral_code, creating one idempotently when missing.
 * Uses the authenticated Supabase client (RLS: select/insert own).
 * On any failure returns null so callers can fall back to a generic share link.
 *
 * Does not create rewards, balances, or attributions — only the shareable code.
 * Future reward machines can reuse the same codes without changing shared URLs.
 */
export async function ensureReferralCodeForUser(
  userId: string,
): Promise<string | null> {
  if (!userId.trim()) return null;

  try {
    const supabase = await createClient();
    if (!supabase) return null;

    const { data: existing, error: selectError } = await supabase
      .from("referral_codes")
      .select("code")
      .eq("owner_user_id", userId)
      .eq("active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (selectError) return null;

    const existingCode = sanitizeReferralCodeForShare(
      (existing?.code as string | null) ?? null,
    );
    if (existingCode) return existingCode;

    for (let attempt = 0; attempt < MAX_INSERT_ATTEMPTS; attempt += 1) {
      const candidate = generateReferralCodeCandidate();
      const { data: inserted, error: insertError } = await supabase
        .from("referral_codes")
        .insert({
          code: candidate,
          owner_user_id: userId,
          active: true,
        })
        .select("code")
        .maybeSingle();

      if (!insertError && inserted?.code) {
        return sanitizeReferralCodeForShare(inserted.code as string);
      }

      // Unique conflict on code — retry with a new candidate.
      // Concurrent insert by same user: re-select existing.
      const { data: again } = await supabase
        .from("referral_codes")
        .select("code")
        .eq("owner_user_id", userId)
        .eq("active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      const recovered = sanitizeReferralCodeForShare(
        (again?.code as string | null) ?? null,
      );
      if (recovered) return recovered;
    }

    return null;
  } catch {
    return null;
  }
}
