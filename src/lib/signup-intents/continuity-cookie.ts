import "server-only";

import { cookies } from "next/headers";
import { getAuthCookieOptions } from "@/lib/supabase/auth-cookie-options";
import { SIGNUP_INTENT_TTL_HOURS } from "./tokens";

export const SIGNUP_INTENT_COOKIE = "amem_signup_intent";

const MAX_AGE_SECONDS = SIGNUP_INTENT_TTL_HOURS * 60 * 60;

export function signupIntentCookieOptions(maxAge = MAX_AGE_SECONDS) {
  return {
    ...getAuthCookieOptions(),
    httpOnly: true,
    maxAge,
  };
}

/** Persist only the opaque intent token for same-browser resume. */
export async function setSignupIntentCookie(token: string): Promise<void> {
  try {
    const store = await cookies();
    store.set(SIGNUP_INTENT_COOKIE, token, signupIntentCookieOptions());
  } catch {
    // Outside a request context (e.g. unit tests) — ignore.
  }
}

export async function readSignupIntentCookie(): Promise<string | null> {
  try {
    const store = await cookies();
    const value = store.get(SIGNUP_INTENT_COOKIE)?.value?.trim();
    return value || null;
  } catch {
    return null;
  }
}

export async function clearSignupIntentCookie(): Promise<void> {
  try {
    const store = await cookies();
    store.set(SIGNUP_INTENT_COOKIE, "", signupIntentCookieOptions(0));
  } catch {
    // Outside a request context — ignore.
  }
}
