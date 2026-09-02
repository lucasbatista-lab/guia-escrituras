import "server-only";

import { cookies } from "next/headers";
import { getAuthCookieOptions } from "@/lib/supabase/auth-cookie-options";
import {
  toCollectedCookie,
  type CollectedRouteCookie,
} from "@/lib/supabase/route-handler";

/** Ephemeral UX proof — not used for auth or authorization. */
export const EMAIL_CONFIRM_FLASH_COOKIE = "amem_email_confirm_flash";
export const EMAIL_CONFIRM_FLASH_VALUE = "verified";
export const EMAIL_CONFIRM_FLASH_MAX_AGE_SECONDS = 10 * 60;

export function emailConfirmFlashCookieOptions(maxAge = EMAIL_CONFIRM_FLASH_MAX_AGE_SECONDS) {
  return {
    ...getAuthCookieOptions(),
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function emailConfirmFlashCookieEntry(): CollectedRouteCookie {
  return toCollectedCookie(
    EMAIL_CONFIRM_FLASH_COOKIE,
    EMAIL_CONFIRM_FLASH_VALUE,
    emailConfirmFlashCookieOptions(),
  );
}

export async function readEmailConfirmFlash(): Promise<boolean> {
  try {
    const store = await cookies();
    return (
      store.get(EMAIL_CONFIRM_FLASH_COOKIE)?.value === EMAIL_CONFIRM_FLASH_VALUE
    );
  } catch {
    return false;
  }
}

export async function clearEmailConfirmFlash(): Promise<void> {
  try {
    const store = await cookies();
    store.set(EMAIL_CONFIRM_FLASH_COOKIE, "", {
      ...emailConfirmFlashCookieOptions(0),
      maxAge: 0,
    });
  } catch {
    // Outside request context (tests) — ignore.
  }
}

/** Read once and clear so the flash cannot be replayed across sessions. */
export async function consumeEmailConfirmFlash(): Promise<boolean> {
  const valid = await readEmailConfirmFlash();
  if (valid) {
    await clearEmailConfirmFlash();
  }
  return valid;
}
