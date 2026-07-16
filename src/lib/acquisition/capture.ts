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

function acqCookieOptions(maxAge: number) {
  const base = getAuthCookieOptions();
  return {
    ...base,
    httpOnly: true,
    maxAge,
  };
}

/**
 * Capture campaign params into first/last-touch cookies on the response.
 * Direct traffic (no campaign) does not clear existing cookies.
 * Does not strip UTMs from the URL.
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
  const existingLast = parseAcquisitionCookie(
    request.cookies.get(ACQ_LAST_COOKIE)?.value,
  );

  if (!existingFirst) {
    response.cookies.set(
      ACQ_FIRST_COOKIE,
      serializeAcquisitionCookie(incoming),
      acqCookieOptions(ACQ_FIRST_MAX_AGE_SECONDS),
    );
  }

  // Always refresh last touch on a new valid campaign URL.
  void existingLast;
  response.cookies.set(
    ACQ_LAST_COOKIE,
    serializeAcquisitionCookie(incoming),
    acqCookieOptions(ACQ_LAST_MAX_AGE_SECONDS),
  );

  return response;
}
