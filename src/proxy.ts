import { updateSession } from "@/lib/supabase/proxy";
import { applyAcquisitionCapture } from "@/lib/acquisition";
import { buildWwwToApexRedirectHref } from "@/lib/edge/canonical-host";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Request entry layer (Next.js proxy).
 * Must live at src/proxy.ts when the App Router is under src/app.
 *
 * Order:
 * 1) www → apex (308) — preserve path + query; no acquisition cookies yet
 * 2) session / private HTML gates (HTTP 307 when anonymous)
 * 3) first/last-touch acquisition cookies on the apex response
 */
export async function proxy(request: NextRequest) {
  const apexHref = buildWwwToApexRedirectHref({
    hostname: request.nextUrl.hostname,
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
  });
  if (apexHref) {
    return NextResponse.redirect(apexHref, 308);
  }

  const response = await updateSession(request);
  return applyAcquisitionCapture(request, response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
