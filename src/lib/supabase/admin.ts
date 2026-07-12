import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "@/lib/supabase/keys";
import { getSupabaseSecretKey } from "@/lib/supabase/secret";
import { AppError } from "@/lib/safety";

/**
 * Admin/service client for trusted server-side writes
 * (assistant messages, usage_events, summaries).
 * Never expose to the browser.
 */
export function createAdminClient() {
  const url = getSupabaseUrl();
  const secret = getSupabaseSecretKey();

  if (!url || !secret) {
    throw new AppError(
      "admin_client_unavailable",
      "admin_client_unavailable",
      503,
      "Operação administrativa indisponível no momento.",
    );
  }

  return createClient(url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
