import "server-only";

import { cookies } from "next/headers";
import type { SignupTrackingParams } from "@/lib/signup-intents/types";
import { ACQ_FIRST_COOKIE, ACQ_LAST_COOKIE } from "./types";
import {
  mergeConversionTracking,
  parseAcquisitionCookie,
} from "./sanitize";

/**
 * Resolve conversion tracking for signup_intent creation.
 * Priority: explicit form/URL params > last-touch cookie > first-touch cookie.
 */
export async function resolveTrackingForSignupIntent(
  explicit?: SignupTrackingParams | null,
): Promise<SignupTrackingParams> {
  let first = null;
  let last = null;
  try {
    const store = await cookies();
    first = parseAcquisitionCookie(store.get(ACQ_FIRST_COOKIE)?.value);
    last = parseAcquisitionCookie(store.get(ACQ_LAST_COOKIE)?.value);
  } catch {
    // Outside request context (unit tests) — merge with explicit only.
  }
  return mergeConversionTracking(explicit, last, first);
}
