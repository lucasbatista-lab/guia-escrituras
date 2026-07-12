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
 * Development: mocks allowed.
 * Preview: mocks only with DEMO_MODE=true.
 * Production: mocks forbidden.
 */
export function allowsMocks(): boolean {
  const runtime = getAppRuntime();
  if (runtime === "development") return true;
  if (runtime === "preview") return isDemoModeFlag();
  return false;
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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    throw new ConfigError(
      "Serviço temporariamente indisponível. Configure o Supabase.",
      "supabase_not_configured",
      503,
    );
  }
}
