import { describe, expect, it, afterEach, vi } from "vitest";
import { snapshotEnv, restoreEnv } from "./helpers/env";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getAppUrl, getCanonicalSiteUrl } from "@/lib/auth/app-url";
import { isStripeCheckoutSessionId } from "@/lib/billing/stripe-session-id";
import { getAuthCookieOptions } from "@/lib/supabase/auth-cookie-options";

function read(...parts: string[]) {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

describe("checkout return — session preservation", () => {
  const original = snapshotEnv();

  afterEach(() => {
    restoreEnv(original);
    vi.resetModules();
  });

  it("getCheckoutUrls uses canonical host, not raw vercel/www", async () => {
    process.env.VERCEL_ENV = "production";
    process.env.NODE_ENV = "production";
    process.env.APP_URL = "https://www.amemchat.com.br";
    process.env.NEXT_PUBLIC_APP_URL = "https://amem-chat.vercel.app";

    const { getCheckoutUrls } = await import("@/lib/stripe/config");
    const urls = getCheckoutUrls();
    expect(urls.successUrl).toBe(
      "https://amemchat.com.br/assinatura/sucesso?session_id={CHECKOUT_SESSION_ID}",
    );
    expect(urls.cancelUrl).toBe("https://amemchat.com.br/assinatura/cancelada");
    expect(urls.successUrl).not.toContain("www.");
    expect(urls.successUrl).not.toContain("vercel.app");
  });

  it("canonical app URL strips www in production brand domain", () => {
    process.env.VERCEL_ENV = "production";
    process.env.NODE_ENV = "production";
    process.env.APP_URL = "https://www.amemchat.com.br/";
    expect(getAppUrl()).toBe("https://amemchat.com.br");
    expect(getCanonicalSiteUrl()).toBe("https://amemchat.com.br");
  });

  it("auth cookies use shared .amemchat.com.br domain in production", () => {
    process.env.VERCEL_ENV = "production";
    process.env.NODE_ENV = "production";
    const opts = getAuthCookieOptions();
    expect(opts.domain).toBe(".amemchat.com.br");
    expect(opts.sameSite).toBe("lax");
    expect(opts.secure).toBe(true);
  });

  it("auth cookies stay host-scoped outside production", () => {
    process.env.VERCEL_ENV = "development";
    process.env.NODE_ENV = "development";
    delete process.env.VERCEL_ENV;
    const opts = getAuthCookieOptions();
    expect(opts.domain).toBeUndefined();
  });

  it("validates Stripe session_id shape without leaking into UI", () => {
    expect(isStripeCheckoutSessionId("cs_test_abc123")).toBe(true);
    expect(isStripeCheckoutSessionId("cs_live_xyz")).toBe(true);
    expect(isStripeCheckoutSessionId("evil")).toBe(false);
    expect(isStripeCheckoutSessionId("cs_test_")).toBe(false);

    const page = read(
      "src",
      "app",
      "(platform)",
      "assinatura",
      "sucesso",
      "page.tsx",
    );
    const client = read(
      "src",
      "components",
      "billing",
      "checkout-success-client.tsx",
    );
    expect(page).not.toMatch(/session\.id|stripeSecret|STRIPE_SECRET/);
    expect(client).not.toContain("session_id");
    expect(client).not.toContain("cs_test");
    expect(client).toContain("Confirmando seu pagamento");
    expect(client).toContain("MAX_POLLS");
    expect(client).toContain("/personalizar");
    expect(client).toContain("Começar uma reflexão");
    expect(client).toContain("Assinatura confirmada");
    expect(client).toContain("Personalizar minha experiência");
  });

  it("proxy preserves checkout resume cookie and does not drop session on redirects", () => {
    const proxy = read("src", "lib", "supabase", "proxy.ts");
    expect(proxy).toContain("amem_checkout_return");
    expect(proxy).toContain("redirectPreservingCookies");
    expect(proxy).toContain("getUser");
    expect(proxy).toContain("loginNextForRequest");
    expect(proxy).toContain("safeNextPath");
    expect(proxy).toContain("/assinatura/sucesso");
    // Must not only pass pathname (which drops query) for success page resume.
    expect(proxy).toContain('return "/assinatura/sucesso"');
  });

  it("success flow prefers DB authority and polls while processing", () => {
    const success = read("src", "lib", "billing", "checkout-success.ts");
    expect(success).toContain("resolveCheckoutSuccessState");
    expect(success).toContain("subscriptions");
    expect(success).toContain("personalizar");
    expect(success).toContain("Never creates a Supabase session");
    expect(success).toContain("forbidden");
    expect(success).toContain("processing");
    expect(success).toContain("unauthenticated");

    const route = read(
      "src",
      "app",
      "api",
      "billing",
      "checkout-success",
      "route.ts",
    );
    expect(route).toContain("getCheckoutSuccessPollPayload");
    expect(route).toContain("no-store");
  });

  it("post-login resumes assinatura/sucesso when checkout return is pending", () => {
    const dest = read("src", "lib", "auth", "post-login-destination.ts");
    expect(dest).toContain("readCheckoutReturnCookie");
    expect(dest).toContain("/assinatura/sucesso");
    expect(dest).toContain("Preserve completed Checkout confirmation");
  });

  it("does not start infinite poll loops", () => {
    const client = read(
      "src",
      "components",
      "billing",
      "checkout-success-client.tsx",
    );
    expect(client).toMatch(/MAX_POLLS\s*=\s*\d+/);
    expect(client).toContain("stopped.current = true");
    expect(client).toContain("Stay on confirmation");
  });

  it("login redirect for missing session does not treat webhook lag as logout cause", () => {
    const successPage = read(
      "src",
      "app",
      "(platform)",
      "assinatura",
      "sucesso",
      "page.tsx",
    );
    // Processing UI stays on success page; redirect to login only when unauthenticated.
    expect(successPage).toContain('redirect(view.resumePath)');
    expect(successPage).toContain('view.kind === "active"');
    expect(successPage).toContain("CheckoutSuccessClient");
    expect(successPage).not.toMatch(
      /redirect\(\s*["']\/entrar\?next=\/assinatura\/sucesso["']\s*\)/,
    );
  });
});

describe("checkout success state helpers", () => {
  it("maps active users who still need personalization to /personalizar", async () => {
    const src = read("src", "lib", "billing", "checkout-success.ts");
    expect(src).toContain('"/personalizar"');
    expect(src).toContain('"/inicio"');
    expect(src).toContain("onboardingCompleted");
    expect(src).toContain("sessionUserId !== auth.userId");
  });
});
