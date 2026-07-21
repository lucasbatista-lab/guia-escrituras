import type { MetadataRoute } from "next";
import { getCanonicalSiteUrl } from "@/lib/auth/app-url";

/** Public URLs only — no private/platform/admin/API routes. */
const PUBLIC_PATHS = [
  "/",
  "/planos",
  "/como-funciona",
  "/mensagens-personalizadas",
  "/transparencia-ia",
  "/termos",
  "/privacidade",
  "/uso-justo",
  "/cancelamento",
  "/ajuda",
  "/entrar",
  "/cadastro",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getCanonicalSiteUrl().replace(/\/$/, "");
  return PUBLIC_PATHS.map((path) => ({
    url: path === "/" ? base : `${base}${path}`,
    priority: path === "/" ? 1 : path === "/planos" ? 0.9 : 0.6,
  }));
}
