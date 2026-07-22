import { hasSupabasePublicEnv } from "@/lib/supabase/keys";

export type AppRuntime = "development" | "preview" | "production";

export function getAppRuntime(): AppRuntime {
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === "production") return "production";
  if (vercelEnv === "preview") return "preview";
  if (process.env.NODE_ENV === "production" && !vercelEnv) {
    return "production";
  }
  if (process.env.NODE_ENV === "production") return "production";
  return "development";
}

export function isDemoModeFlag(): boolean {
  return process.env.DEMO_MODE === "true";
}

/**
 * True when DEMO_MODE is requested alongside credentials that imply a real
 * remote backend or live billing. Detection uses prefixes/presence only —
 * never logs or returns secret values.
 */
export function hasDemoSecretConflict(): boolean {
  if (!isDemoModeFlag()) return false;
  const stripe = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  if (stripe.startsWith("sk_live_")) return true;
  // Service-role / secret key presence means a privileged remote project.
  if (process.env.SUPABASE_SECRET_KEY?.trim()) return true;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) return true;
  return false;
}

/**
 * Development: mocks allowed (local deterministic harness).
 * Preview: mocks only with DEMO_MODE=true, without a configured Supabase
 * project, and without live/privileged secret conflict.
 * Production: mocks always forbidden (DEMO_MODE ignored).
 */
export function allowsMocks(): boolean {
  const runtime = getAppRuntime();
  if (runtime === "production") return false;
  if (runtime === "development") return true;
  // preview
  if (!isDemoModeFlag()) return false;
  if (hasDemoSecretConflict()) return false;
  if (hasSupabasePublicEnv()) return false;
  return true;
}

export function requiresRealSupabase(): boolean {
  return !allowsMocks();
}

export function requiresRealOpenAiForChat(): boolean {
  return !allowsMocks();
}

export class ConfigError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number = 503,
  ) {
    super(message);
    this.name = "ConfigError";
  }
}

export function assertSupabaseConfiguredForRuntime(): void {
  if (!requiresRealSupabase()) return;
  if (!hasSupabasePublicEnv()) {
    throw new ConfigError(
      "Serviço temporariamente indisponível. Configure o Supabase.",
      "supabase_not_configured",
      503,
    );
  }
}

/**
 * Fail closed when DEMO_MODE conflicts with a remote/live preview setup.
 * Production leftover DEMO_MODE is ignored here (mocks already forbidden).
 * Message never includes secret values or env contents.
 */
export function assertDemoModeSafe(): void {
  if (!isDemoModeFlag()) return;
  const runtime = getAppRuntime();
  if (runtime === "production") return;
  if (runtime === "preview" && hasDemoSecretConflict()) {
    throw new ConfigError(
      "Configuração de ambiente inválida para este runtime.",
      "demo_secret_conflict",
      503,
    );
  }
  if (runtime === "preview" && hasSupabasePublicEnv()) {
    throw new ConfigError(
      "Configuração de ambiente inválida para este runtime.",
      "demo_remote_conflict",
      503,
    );
  }
}
