import "server-only";

import {
  AppStoreServerAPIClient,
  Environment,
  SignedDataVerifier,
} from "@apple/app-store-server-library";
import { loadAppleRootCertificates } from "@/lib/apple/certs";
import {
  AppleConfigError,
  getAppleIapConfig,
  isAppleIapConfigured,
  isAppleServerApiConfigured,
  type AppleIapEnvironment,
} from "@/lib/apple/config";

export function toAppleLibraryEnvironment(
  environment: AppleIapEnvironment,
): Environment {
  return environment === "production"
    ? Environment.PRODUCTION
    : Environment.SANDBOX;
}

/**
 * Fail-closed verifier factory. Never returns a pass-through verifier.
 */
export function createAppleSignedDataVerifier(
  environmentOverride?: AppleIapEnvironment,
): SignedDataVerifier {
  if (!isAppleIapConfigured()) {
    throw new AppleConfigError(
      "Apple IAP indisponível: configure APPLE_BUNDLE_ID no servidor.",
    );
  }
  const cfg = getAppleIapConfig();
  const environment = environmentOverride ?? cfg.environment;
  const roots = loadAppleRootCertificates();
  return new SignedDataVerifier(
    roots,
    true,
    toAppleLibraryEnvironment(environment),
    cfg.bundleId,
    environment === "production" ? (cfg.appAppleId ?? undefined) : undefined,
  );
}

/**
 * Optional App Store Server API client for future reconciliation.
 * Not used for entitlement grants in this wave.
 */
export function createAppleAppStoreServerApiClient(): AppStoreServerAPIClient {
  if (!isAppleServerApiConfigured()) {
    throw new AppleConfigError(
      "App Store Server API indisponível: configure APPLE_ISSUER_ID, APPLE_KEY_ID e APPLE_IAP_PRIVATE_KEY.",
    );
  }
  const cfg = getAppleIapConfig();
  return new AppStoreServerAPIClient(
    cfg.privateKeyPem!,
    cfg.keyId!,
    cfg.issuerId!,
    cfg.bundleId,
    toAppleLibraryEnvironment(cfg.environment),
  );
}
