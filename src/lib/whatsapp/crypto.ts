import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Meta Cloud API webhook signature: X-Hub-Signature-256 = sha256=<hex>
 * Compare in constant time. Never log secret or signature.
 */

export function buildWhatsAppSignatureHeader(
  rawBody: string,
  appSecret: string,
): string {
  const digest = createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");
  return `sha256=${digest}`;
}

export function verifyWhatsAppSignature(input: {
  rawBody: string;
  signatureHeader: string | null | undefined;
  appSecret: string;
}): boolean {
  const header = input.signatureHeader?.trim() ?? "";
  if (!header) return false;
  const match = /^sha256=([a-f0-9]{64})$/i.exec(header);
  if (!match) return false;

  const expected = createHmac("sha256", input.appSecret)
    .update(input.rawBody, "utf8")
    .digest();
  const provided = Buffer.from(match[1], "hex");
  if (provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(provided, expected);
  } catch {
    return false;
  }
}

/** Constant-time string compare for verify_token handshake. */
export function safeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    // Still run a compare to reduce trivial timing leaks on length.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
