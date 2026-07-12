import "server-only";

import { allowsMocks } from "@/config/runtime";
import { hasSupabasePublicEnv } from "@/lib/supabase/keys";
import { createMemoryRepositories } from "./memory";
import { createSupabaseRepositories } from "./supabase";
import type { DataRepositories } from "./types";

export type { DataRepositories } from "./types";
export type * from "./types";
export { createMemoryRepositories } from "./memory";

/**
 * Resolve persistence backend.
 * Memory only when mocks are allowed AND public Supabase env is absent.
 */
export function getRepositories(): DataRepositories {
  if (hasSupabasePublicEnv()) {
    return createSupabaseRepositories();
  }

  if (!allowsMocks()) {
    throw new Error(
      "Persistência real exigida: configure NEXT_PUBLIC_SUPABASE_URL e a publishable key.",
    );
  }

  return createMemoryRepositories();
}
