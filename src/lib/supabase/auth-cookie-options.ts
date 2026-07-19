import { getAppRuntime } from "@/config/runtime";

/**
 * Shared auth cookie options so sessions survive apex ↔ www on the
 * production domain (cookies are not host-only for amemchat.com.br).
 * Never apply the production domain on localhost or *.vercel.app.
 */
export function getAuthCookieOptions(): {
  path: string;
  sameSite: "lax";
  secure: boolean;
  domain?: string;
} {
  const runtime = getAppRuntime();
  const secure = runtime === "production" || runtime === "preview";
  const base = {
    path: "/",
    sameSite: "lax" as const,
    secure,
  };

  // Only the real Vercel Production deployment shares Domain=.amemchat.com.br.
  // Local `next start` (NODE_ENV=production, no VERCEL_ENV) must stay host-only.
  if (process.env.VERCEL_ENV === "production") {
    return { ...base, domain: ".amemchat.com.br" };
  }

  return base;
}
