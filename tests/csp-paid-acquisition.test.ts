import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

function cspDirective(csp: string, name: string): string {
  const part = csp
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${name} `) || s === name);
  expect(part, `missing CSP directive ${name}`).toBeTruthy();
  return part!;
}

describe("CSP for paid acquisition (VSL Blob + Meta Pixel)", () => {
  const config = read("next.config.ts");
  const cspMatch = config.match(
    /const CONTENT_SECURITY_POLICY = \[([\s\S]*?)\]\.join/,
  );
  expect(cspMatch).toBeTruthy();
  const csp = cspMatch![1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith('"'))
    .map((line) => line.replace(/^"/, "").replace(/",?$/, ""))
    .join("; ");

  it("allows same-origin and Vercel Blob public media only", () => {
    const media = cspDirective(csp, "media-src");
    expect(media).toContain("'self'");
    expect(media).toContain("https://*.public.blob.vercel-storage.com");
    // Only the Blob store wildcard — not an open media-src *
    expect(media).toBe(
      "media-src 'self' https://*.public.blob.vercel-storage.com",
    );
    expect(media).not.toContain("cloudinary");
    expect(media).not.toContain("youtube");
    expect(media).not.toContain("mux.com");
  });

  it("allows minimal Meta Pixel hosts derived from pixel-loader + Meta docs", () => {
    const script = cspDirective(csp, "script-src");
    const connect = cspDirective(csp, "connect-src");
    const img = cspDirective(csp, "img-src");

    expect(script).toContain("https://connect.facebook.net");
    expect(connect).toContain("https://www.facebook.com");
    expect(connect).toContain("https://connect.facebook.net");
    expect(img).toContain("https://www.facebook.com");

    // No broad Facebook wildcards / unused analytics
    expect(script).not.toContain("*.facebook.com");
    expect(script).not.toContain("*.facebook.net");
    expect(connect).not.toContain("*.facebook.com");
    expect(config).not.toContain("googletagmanager");
    expect(config).not.toContain("google-analytics");
    expect(config).not.toContain("googleapis.com");
  });

  it("keeps prior hardening and does not open default-src", () => {
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("https://*.supabase.co");
    expect(csp).toContain("wss://*.supabase.co");
    expect(config).not.toContain("script-src *");
    expect(config).not.toContain("default-src *");
    expect(config).not.toContain("unsafe-eval");
    expect(config).not.toContain("js.stripe.com");
  });

  it("documents that consent still gates Pixel despite CSP", () => {
    const gate = read("src", "components", "meta", "meta-pixel-gate.tsx");
    const loader = read("src", "lib", "meta", "pixel-loader.ts");
    expect(gate).toContain("advertisingGranted");
    expect(gate).toContain("disableMetaPixelRuntime");
    expect(loader).toContain("https://connect.facebook.net/en_US/fbevents.js");
  });
});

describe("paid landing VSL media contract", () => {
  const media = read(
    "src",
    "components",
    "marketing",
    "paid-landing-v2",
    "paid-landing-v2-media.tsx",
  );

  it("falls back to static product surface without video env", () => {
    expect(media).toContain("NEXT_PUBLIC_PAID_LANDING_VIDEO_URL");
    expect(media).toContain("PaidLandingV2ProductSurface");
    expect(media).toMatch(/if\s*\(\s*!videoUrl\s*\)/);
  });

  it("uses native video without autoplay audio and without cover crop", () => {
    expect(media).toContain("<video");
    expect(media).toContain("controls");
    expect(media).toContain("playsInline");
    expect(media).toContain('preload="metadata"');
    expect(media).toContain('poster={POSTER_SRC}');
    expect(media).toContain("/marketing/comece-poster.svg");
    expect(media).toContain('type="video/mp4"');
    expect(media).not.toContain("autoPlay");
    expect(media).not.toContain("autoplay");
    expect(media).toContain("object-contain");
    expect(media).not.toContain("object-cover");
    expect(media).toContain("aspect-[9/16]");
  });
});

describe("Purchase / CAPI non-regression (read-only contracts)", () => {
  it("keeps Purchase on webhook after financial handling only", () => {
    const webhook = read("src", "lib", "stripe", "webhook.ts");
    const emit = read("src", "lib", "meta", "emit-checkout-conversions.ts");
    const success = read(
      "src",
      "app",
      "(platform)",
      "assinatura",
      "sucesso",
      "page.tsx",
    );
    const successClient = read(
      "src",
      "components",
      "billing",
      "checkout-success-client.tsx",
    );

    expect(webhook).toContain('case "checkout.session.completed"');
    expect(webhook).toContain("handleCheckoutCompleted");
    expect(webhook).toContain("emitPurchaseConversionSafe");
    expect(emit).toContain("emitPurchaseConversionSafe");
    expect(emit).toContain("providerEventId");
    expect(success).not.toContain("emitPurchaseConversionSafe");
    expect(success).not.toContain("sendMetaCapiEvent");
    expect(successClient).not.toContain("Purchase");
    expect(successClient).not.toContain("fbq");
  });
});
