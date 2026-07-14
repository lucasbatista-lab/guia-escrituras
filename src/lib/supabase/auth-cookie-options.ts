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

  if (runtime === "production") {
    return { ...base, domain: ".amemchat.com.br" };
  }

  return base;
}
