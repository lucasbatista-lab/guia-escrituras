import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, hasSupabaseEnv } from "@/lib/utils";

export function createClient() {
  if (!hasSupabaseEnv()) {
    throw new Error(
      "Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabaseAnonKey(),
  );
}
