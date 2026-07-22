import type { MetadataRoute } from "next";
import { getAppRuntime } from "@/config/runtime";
import { getCanonicalSiteUrl } from "@/lib/auth/app-url";

/**
 * Crawl map for search engines.
 * Robots is not access control — platform/admin remain auth-gated separately.
 */
export default function robots(): MetadataRoute.Robots {
  const base = getCanonicalSiteUrl();

  // Preview/dev deployments must not be indexed under vercel/localhost hosts.
  if (getAppRuntime() !== "production") {
    return {
      rules: [
        {
          userAgent: "*",
          disallow: "/",
        },
      ],
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/api",
          "/api/",
          "/conta",
          "/conversar",
          "/conversas",
          "/inicio",
          "/onboarding",
          "/personalizar",
          "/assinar",
          "/assinatura",
          "/auth",
          "/jornada",
          "/jornada/",
          "/jornadas",
          "/jornadas/",
          "/confira-seu-email",
          "/email-confirmado",
          "/recuperar-senha",
          "/redefinir-senha",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base.replace(/^https?:\/\//, ""),
  };
}
