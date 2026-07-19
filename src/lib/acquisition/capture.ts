import type { NextRequest, NextResponse } from "next/server";
import { getAuthCookieOptions } from "@/lib/supabase/auth-cookie-options";
import {
  ACQ_FIRST_COOKIE,
  ACQ_FIRST_MAX_AGE_SECONDS,
  ACQ_LAST_COOKIE,
  ACQ_LAST_MAX_AGE_SECONDS,
} from "./types";
import {
  parseAcquisitionCookie,
  serializeAcquisitionCookie,
  touchFromSearchParams,
} from "./sanitize";

/** Centralized acquisition cookie flags (Path/SameSite/Secure/HttpOnly/maxAge). */
export function acquisitionCookieOptions(maxAge: number) {
  const base = getAuthCookieOptions();
  return {
    path: base.path,
    sameSite: base.sameSite,
    secure: base.secure,
    ...(base.domain ? { domain: base.domain } : {}),
    httpOnly: true as const,
    maxAge,
  };
}

/**
 * Capture campaign params into first/last-touch cookies on the response.
 * Direct traffic (no campaign) does not clear existing cookies.
 * Does not strip UTMs from the URL.
 *
 * Runs in the request proxy so cookies are set even when the public page
 * body is served from a cacheable/static render — only when this layer runs.
 */
export function applyAcquisitionCapture(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  const incoming = touchFromSearchParams(
    request.nextUrl.searchParams,
    request.nextUrl.pathname,
  );

  if (!incoming) {
    return response;
  }

  const existingFirst = parseAcquisitionCookie(
    request.cookies.get(ACQ_FIRST_COOKIE)?.value,
  );

  if (!existingFirst) {
    response.cookies.set(
      ACQ_FIRST_COOKIE,
      serializeAcquisitionCookie(incoming),
      acquisitionCookieOptions(ACQ_FIRST_MAX_AGE_SECONDS),
    );
  }

  // Always refresh last touch on a new valid campaign URL.
  response.cookies.set(
    ACQ_LAST_COOKIE,
    serializeAcquisitionCookie(incoming),
    acquisitionCookieOptions(ACQ_LAST_MAX_AGE_SECONDS),
  );

  return response;
}
