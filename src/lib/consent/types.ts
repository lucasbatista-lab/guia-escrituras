import { CONSENT_POLICY_VERSION } from "./constants";

export type AdvertisingConsentStatus = "granted" | "denied";

export type ConsentRecord = {
  version: typeof CONSENT_POLICY_VERSION;
  advertising: AdvertisingConsentStatus;
  updatedAt: string;
};

export type ConsentDecision = ConsentRecord | null;

export function isConsentRecord(value: unknown): value is ConsentRecord {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.version === CONSENT_POLICY_VERSION &&
    (v.advertising === "granted" || v.advertising === "denied") &&
    typeof v.updatedAt === "string"
  );
}
