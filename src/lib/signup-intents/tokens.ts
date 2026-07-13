import { createHash, randomBytes } from "node:crypto";

const TOKEN_BYTES = 32;

export function generateSignupIntentToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashSignupIntentToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export const SIGNUP_INTENT_TTL_HOURS = 48;

export function signupIntentExpiresAt(
  from = new Date(),
): string {
  const expires = new Date(from.getTime() + SIGNUP_INTENT_TTL_HOURS * 60 * 60 * 1000);
  return expires.toISOString();
}

export function isSignupIntentExpired(expiresAt: string, now = new Date()): boolean {
  return new Date(expiresAt).getTime() <= now.getTime();
}
