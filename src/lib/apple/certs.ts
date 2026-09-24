import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Official Apple Root CAs (public) for SignedDataVerifier.
 * Sourced from https://www.apple.com/certificateauthority/
 * Never substitute unofficial certificates.
 */
export function loadAppleRootCertificates(): Buffer[] {
  const dir = join(process.cwd(), "src", "lib", "apple", "certs");
  const names = ["AppleRootCA-G3.cer", "AppleRootCA-G2.cer"] as const;
  const buffers: Buffer[] = [];
  for (const name of names) {
    const buf = readFileSync(join(dir, name));
    if (buf.length < 100 || buf.toString("utf8", 0, 15).includes("<!DOCTYPE")) {
      throw new Error(`apple_root_cert_invalid:${name}`);
    }
    buffers.push(buf);
  }
  return buffers;
}
