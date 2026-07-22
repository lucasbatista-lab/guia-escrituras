import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { snapshotEnv, restoreEnv } from "./helpers/env";
import { getBrandConfig } from "@/config/brand";
import { getCanonicalSiteUrl } from "@/lib/auth/app-url";
import {
  buildPublicPageMetadata,
  privateRobotsMetadata,
  publicCanonicalPath,
  publicPageUrl,
  rootRobotsMetadata,
} from "@/lib/seo";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import {
  buildOrganicShareUrl,
  SHARE_TEXT,
  SHARE_TITLE,
  isOrganicShareUrl,
} from "@/lib/share";

const root = process.cwd();

function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("SEO & social readiness — brand and metadata helpers", () => {
  const original = snapshotEnv();

  afterEach(() => {
    restoreEnv(original);
  });

  it("exposes seo title/description without divine-voice claims", () => {
    const brand = getBrandConfig();
    expect(brand.seoTitle).toBe(
      "Amém Chat | Reflexões cristãs para situações reais",
    );
    expect(brand.seoDescription).toMatch(/inteligência artificial/i);
    expect(brand.seoDescription).not.toMatch(/revelaç/i);
    expect(brand.seoDescription).not.toMatch(/fale diretamente/i);
    expect(brand.seoDescription).not.toMatch(/respostas de Deus/i);
  });

  it("builds path-scoped canonical without query params", () => {
    expect(publicCanonicalPath("/planos?utm_source=share&ref=ABC")).toBe(
      "/planos",
    );
    expect(publicCanonicalPath("/")).toBe("/");
  });

  it("public page metadata sets canonical, OG url, and social images", () => {
    process.env.VERCEL_ENV = "production";
    process.env.NODE_ENV = "production";
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.APP_URL;
    const meta = buildPublicPageMetadata({
      title: "Planos",
      description: "Planos do Amém Chat.",
      path: "/planos?utm_campaign=invite",
    });
    expect(meta.alternates?.canonical).toBe("/planos");
    expect(meta.openGraph?.url).toBe("https://amemchat.com.br/planos");
    expect(String(meta.openGraph?.url)).not.toContain("utm_");
    expect(meta.twitter?.card).toBe("summary_large_image");

    const ogImages = meta.openGraph?.images;
    expect(ogImages).toBeDefined();
    const firstOg = Array.isArray(ogImages) ? ogImages[0] : ogImages;
    expect(firstOg).toMatchObject({
      url: "/opengraph-image",
      width: 1200,
      height: 630,
      type: "image/png",
    });

    const twImages = meta.twitter?.images;
    expect(twImages).toBeDefined();
    const firstTw = Array.isArray(twImages) ? twImages[0] : twImages;
    expect(firstTw).toMatchObject({
      url: "/twitter-image",
      width: 1200,
      height: 630,
    });

    const resolvedOg = new URL("/opengraph-image", "https://amemchat.com.br").href;
    const resolvedTw = new URL("/twitter-image", "https://amemchat.com.br").href;
    expect(resolvedOg).toBe("https://amemchat.com.br/opengraph-image");
    expect(resolvedTw).toBe("https://amemchat.com.br/twitter-image");
    expect(resolvedOg).not.toMatch(/localhost|www\.amemchat|vercel\.app/);
    expect(resolvedTw).not.toMatch(/localhost|www\.amemchat|vercel\.app/);
  });

  it("root layout and home wire explicit social images for crawlers", () => {
    process.env.VERCEL_ENV = "production";
    process.env.NODE_ENV = "production";
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.APP_URL;
    expect(getCanonicalSiteUrl()).toBe("https://amemchat.com.br");
    expect(publicPageUrl("/")).toBe("https://amemchat.com.br");

    const layout = read("src", "app", "layout.tsx");
    expect(layout).toContain("socialOpenGraphImages");
    expect(layout).toContain("socialTwitterImages");
    expect(layout).toContain("metadataBase");
    expect(layout).toContain("brand.canonicalUrl");
    expect(layout).toContain("summary_large_image");
    expect(layout).not.toContain('canonical: "/"');

    const home = read("src", "app", "(marketing)", "page.tsx");
    expect(home).toContain("socialOpenGraphImages");
    expect(home).toContain("socialTwitterImages");
    expect(home).toContain('canonical: "/"');
    expect(home).toContain("brand.seoTitle");
    expect(home).toContain("brand.seoDescription");
  });

  it("root robots index only in production", () => {
    process.env.VERCEL_ENV = "production";
    process.env.NODE_ENV = "production";
    expect(rootRobotsMetadata()).toEqual({ index: true, follow: true });

    process.env.VERCEL_ENV = "preview";
    expect(rootRobotsMetadata()).toEqual({ index: false, follow: false });
  });

  it("private robots metadata is noindex", () => {
    expect(privateRobotsMetadata.robots).toMatchObject({
      index: false,
      follow: false,
    });
  });
});

describe("SEO & social readiness — OG image and layouts", () => {
  it("ships opengraph-image and twitter-image modules", () => {
    expect(existsSync(join(root, "src", "app", "opengraph-image.tsx"))).toBe(
      true,
    );
    expect(existsSync(join(root, "src", "app", "twitter-image.tsx"))).toBe(
      true,
    );
    const og = read("src", "app", "opengraph-image.tsx");
    expect(og).toContain("1200");
    expect(og).toContain("630");
    expect(og).toContain("Amém Chat");
    expect(og).toContain("Reflexões cristãs para situações reais");
    expect(og).not.toContain("fetch(");
    expect(og).not.toContain("https://fonts");
  });

  it("OG image module exports a renderable ImageResponse factory", async () => {
    const mod = await import("@/app/opengraph-image");
    expect(mod.size).toEqual({ width: 1200, height: 630 });
    expect(mod.contentType).toBe("image/png");
    const response = mod.default();
    expect(response).toBeTruthy();
    expect(typeof response).toBe("object");
  });

  it("marks platform and admin layouts as noindex", () => {
    const platform = read("src", "app", "(platform)", "layout.tsx");
    const admin = read("src", "app", "admin", "layout.tsx");
    expect(platform).toContain("privateRobotsMetadata");
    expect(admin).toContain("privateRobotsMetadata");
  });

  it("marks transactional auth pages as noindex and entry pages as public", () => {
    expect(read("src", "app", "(auth)", "confira-seu-email", "page.tsx")).toContain(
      "authPrivateMetadata",
    );
    expect(read("src", "app", "(auth)", "recuperar-senha", "page.tsx")).toContain(
      "authPrivateMetadata",
    );
    expect(read("src", "app", "(auth)", "entrar", "page.tsx")).toContain(
      "authEntryMetadata",
    );
    expect(read("src", "app", "(auth)", "cadastro", "page.tsx")).toContain(
      "authEntryMetadata",
    );
  });
});

describe("SEO & social readiness — robots and sitemap", () => {
  const original = snapshotEnv();

  afterEach(() => {
    restoreEnv(original);
  });

  it("production robots allow public and block private routes", () => {
    process.env.VERCEL_ENV = "production";
    process.env.NODE_ENV = "production";
    delete process.env.APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    const doc = robots();
    const rule = Array.isArray(doc.rules) ? doc.rules[0] : doc.rules;
    expect(rule?.allow).toBe("/");
    expect(rule?.disallow).toEqual(
      expect.arrayContaining([
        "/admin",
        "/api",
        "/conta",
        "/conversar",
        "/conversas",
        "/auth",
        "/assinatura",
        "/confira-seu-email",
        "/jornada",
        "/jornada/",
        "/jornadas",
        "/jornadas/",
      ]),
    );
    expect(doc.sitemap).toBe("https://amemchat.com.br/sitemap.xml");
  });

  it("sitemap contains only public absolute URLs", () => {
    process.env.VERCEL_ENV = "production";
    process.env.NODE_ENV = "production";
    delete process.env.APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    const entries = sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain("https://amemchat.com.br");
    expect(urls).toContain("https://amemchat.com.br/planos");
    expect(urls).toContain("https://amemchat.com.br/entrar");
    expect(urls.some((u) => u.includes("/admin"))).toBe(false);
    expect(urls.some((u) => u.includes("/api"))).toBe(false);
    expect(urls.some((u) => u.includes("/conta"))).toBe(false);
    expect(urls.some((u) => u.includes("/conversar"))).toBe(false);
    expect(urls.some((u) => u.includes("/conversas"))).toBe(false);
    expect(urls.every((u) => u.startsWith("https://amemchat.com.br"))).toBe(
      true,
    );
    expect(urls.every((u) => !u.includes("?"))).toBe(true);
  });
});

describe("SEO & social readiness — organic sharing", () => {
  const original = snapshotEnv();

  afterEach(() => {
    restoreEnv(original);
  });

  it("share title/text stay public and AI-honest", () => {
    expect(SHARE_TITLE).toContain("Amém Chat");
    expect(SHARE_TITLE).toContain("situações reais");
    expect(SHARE_TEXT).toMatch(/inteligência artificial/i);
    expect(SHARE_TEXT).not.toMatch(/userId|email|token|conversa/i);
  });

  it("share URL keeps UTMs while pointing at public home origin", () => {
    process.env.VERCEL_ENV = "production";
    process.env.NODE_ENV = "production";
    const url = buildOrganicShareUrl({
      origin: "https://amemchat.com.br",
      content: "home_final_cta",
      referralCode: "ABC123",
    });
    expect(isOrganicShareUrl(url)).toBe(true);
    expect(url.startsWith("https://amemchat.com.br/")).toBe(true);
    expect(url).toContain("utm_source=share");
    expect(url).toContain("ref=ABC123");
    expect(url).not.toMatch(/user_|@|eyJ/);
    // Canonical helpers never absorb UTMs.
    expect(publicCanonicalPath("/?utm_source=share")).toBe("/");
  });

  it("share invite UI still uses Web Share / WhatsApp / clipboard paths", () => {
    const invite = read("src", "components", "share", "share-invite.tsx");
    expect(invite).toContain("navigator.share");
    expect(invite).toContain("buildWhatsAppShareHref");
    expect(invite).toContain("shareUrl");
  });
});
