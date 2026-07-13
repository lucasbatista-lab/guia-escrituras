import type { MetadataRoute } from "next";
import { getCanonicalSiteUrl } from "@/lib/auth/app-url";

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
  "/entrar",
  "/cadastro",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getCanonicalSiteUrl();
  const now = new Date();
  return PUBLIC_PATHS.map((path) => ({
    url: path === "/" ? base : `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "/" || path === "/planos" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/planos" ? 0.9 : 0.6,
  }));
}
