import {
  ADVERTISING_COOKIE_NAMES,
  CONSENT_COOKIE_NAME,
  CONSENT_MAX_AGE_SECONDS,
  CONSENT_POLICY_VERSION,
  CONSENT_STORAGE_KEY,
} from "./constants";
import { isConsentRecord, type ConsentRecord } from "./types";

function readCookieRaw(name: string): string | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split("; ");
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq) === name) {
      return decodeURIComponent(part.slice(eq + 1));
    }
  }
  return null;
}

function writeCookie(name: string, value: string, maxAge: number): void {
  if (typeof document === "undefined") return;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function clearCookie(name: string): void {
  if (typeof document === "undefined") return;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
  // Best-effort host-only clear for Meta cookies that may omit Path.
  document.cookie = `${name}=; Max-Age=0; SameSite=Lax${secure}`;
}

export function parseConsentPayload(raw: string | null): ConsentRecord | null {
  if (!raw?.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isConsentRecord(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readStoredConsent(): ConsentRecord | null {
  if (typeof window === "undefined") return null;
  const fromCookie = parseConsentPayload(readCookieRaw(CONSENT_COOKIE_NAME));
  if (fromCookie) return fromCookie;
  try {
    return parseConsentPayload(window.localStorage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeStoredConsent(
  advertising: ConsentRecord["advertising"],
): ConsentRecord {
  const record: ConsentRecord = {
    version: CONSENT_POLICY_VERSION,
    advertising,
    updatedAt: new Date().toISOString(),
  };
  const payload = JSON.stringify(record);
  writeCookie(CONSENT_COOKIE_NAME, payload, CONSENT_MAX_AGE_SECONDS);
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, payload);
  } catch {
    // Persistence best-effort; cookie remains primary for server reads.
  }
  return record;
}

/** Remove advertising cookies this origin can clear. Never touches amem_acq_*. */
export function clearAdvertisingCookies(): void {
  for (const name of ADVERTISING_COOKIE_NAMES) {
    clearCookie(name);
  }
}

export function hasAdvertisingConsent(record: ConsentRecord | null): boolean {
  return record?.advertising === "granted";
}

/** Server-readable cookie helper (Next cookies().get value). */
export function parseConsentCookieValue(
  value: string | undefined | null,
): ConsentRecord | null {
  return parseConsentPayload(value ?? null);
}
