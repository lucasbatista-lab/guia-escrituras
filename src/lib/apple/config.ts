import "server-only";

export type AppleIapEnvironment = "sandbox" | "production";

export type AppleIapConfig = {
  bundleId: string;
  /** Required for production SignedDataVerifier. */
  appAppleId: number | null;
  environment: AppleIapEnvironment;
  issuerId: string | null;
  keyId: string | null;
  /** PEM contents (may include escaped newlines). */
  privateKeyPem: string | null;
};

export class AppleConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppleConfigError";
  }
}

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

/**
 * Apple IAP is optional. When unset, Stripe/web continue; Apple endpoints fail closed.
 */
export function isAppleIapConfigured(): boolean {
  return Boolean(readEnv("APPLE_BUNDLE_ID"));
}

export function getAppleIapConfig(): AppleIapConfig {
  const bundleId = readEnv("APPLE_BUNDLE_ID");
  if (!bundleId) {
    throw new AppleConfigError(
      "Apple IAP indisponível: configure APPLE_BUNDLE_ID no servidor.",
    );
  }

  const envRaw = (readEnv("APPLE_IAP_ENVIRONMENT") ?? "sandbox").toLowerCase();
  const environment: AppleIapEnvironment =
    envRaw === "production" ? "production" : "sandbox";

  const appAppleIdRaw = readEnv("APPLE_APP_APPLE_ID");
  let appAppleId: number | null = null;
  if (appAppleIdRaw) {
    const parsed = Number(appAppleIdRaw);
    if (!Number.isFinite(parsed)) {
      throw new AppleConfigError("APPLE_APP_APPLE_ID inválido.");
    }
    appAppleId = parsed;
  }

  if (environment === "production" && appAppleId == null) {
    throw new AppleConfigError(
      "APPLE_APP_APPLE_ID é obrigatório quando APPLE_IAP_ENVIRONMENT=production.",
    );
  }

  const privateKeyPem = readEnv("APPLE_IAP_PRIVATE_KEY")?.replace(
    /\\n/g,
    "\n",
  ) ?? null;

  return {
    bundleId,
    appAppleId,
    environment,
    issuerId: readEnv("APPLE_ISSUER_ID"),
    keyId: readEnv("APPLE_KEY_ID"),
    privateKeyPem,
  };
}

export function isAppleServerApiConfigured(): boolean {
  if (!isAppleIapConfigured()) return false;
  try {
    const cfg = getAppleIapConfig();
    return Boolean(cfg.issuerId && cfg.keyId && cfg.privateKeyPem);
  } catch {
    return false;
  }
}
