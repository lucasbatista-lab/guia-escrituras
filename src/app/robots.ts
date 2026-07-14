import type { MetadataRoute } from "next";
import { getCanonicalSiteUrl } from "@/lib/auth/app-url";

export default function robots(): MetadataRoute.Robots {
  const base = getCanonicalSiteUrl();
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
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
