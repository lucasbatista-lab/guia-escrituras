import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
  hasSupabasePublicEnv,
} from "@/lib/supabase/keys";
import { getAuthCookieOptions } from "@/lib/supabase/auth-cookie-options";

/**
 * Server Supabase client with user cookies.
 * Never use the secret/service role key here.
 */
export async function createClient() {
  if (!hasSupabasePublicEnv()) {
    return null;
  }

  const cookieStore = await cookies();
  const cookieOptions = getAuthCookieOptions();

  return createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookieOptions,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, { ...cookieOptions, ...options }),
          );
        } catch {
          // Called from a Server Component — proxy refresh handles sessions.
        }
      },
    },
  });
}
