import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { getAppRuntime } from "@/config/runtime";
import { getCanonicalSiteUrl } from "@/lib/auth/app-url";

/** Absolute public path without query string (UTMs never enter canonical). */
export function publicCanonicalPath(path: string): string {
  if (!path || path === "/") return "/";
  const clean = path.split("?")[0]?.split("#")[0] ?? "/";
  return clean.startsWith("/") ? clean : `/${clean}`;
}

export function publicPageUrl(path: string): string {
  const base = getCanonicalSiteUrl().replace(/\/$/, "");
  const canonicalPath = publicCanonicalPath(path);
  return canonicalPath === "/" ? base : `${base}${canonicalPath}`;
}

/**
 * Metadata for public marketing/legal pages.
 * Sets path-scoped canonical + OG url so root homepage values do not leak.
 */
export function buildPublicPageMetadata(input: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const canonicalPath = publicCanonicalPath(input.path);
  const url = publicPageUrl(canonicalPath);
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: `${input.title} · ${brand.name}`,
      description: input.description,
      url,
      siteName: brand.name,
      locale: "pt_BR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${input.title} · ${brand.name}`,
      description: input.description,
    },
  };
}

/** Private / transactional surfaces — never indexable. */
export const privateRobotsMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

/** Root robots: index in production only; previews/dev stay out of search. */
export function rootRobotsMetadata(): Metadata["robots"] {
  if (getAppRuntime() !== "production") {
    return {
      index: false,
      follow: false,
    };
  }
  return {
    index: true,
    follow: true,
  };
}
