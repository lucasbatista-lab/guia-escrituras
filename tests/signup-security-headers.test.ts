import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SIGNUP_CHECK_EMAIL_PUBLIC_MESSAGE } from "@/lib/auth/sign-up-errors";

function read(...parts: string[]) {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

describe("signup anti-enumeration contracts", () => {
  it("action never returns email_taken to the client", () => {
    const src = read("src", "lib", "auth", "sign-up-action.ts");
    expect(src).toContain("checkEmailSoftSuccess");
    expect(src).not.toContain('fail("email_taken"');
    expect(src).toContain("Do not associate intent");
  });

  it("check-email copy is enumeration-safe for signup", () => {
    const ux = read("src", "components", "auth", "check-email-experience.tsx");
    expect(ux).toContain("SIGNUP_CHECK_EMAIL_PUBLIC_MESSAGE");
    expect(SIGNUP_CHECK_EMAIL_PUBLIC_MESSAGE).toMatch(/Confira seu e-mail/i);
    expect(SIGNUP_CHECK_EMAIL_PUBLIC_MESSAGE).toMatch(/já exista uma conta/i);
  });
});

describe("web security headers", () => {
  it("configures global hardening headers and CSP", () => {
    const config = read("next.config.ts");
    expect(config).toContain("Strict-Transport-Security");
    expect(config).toContain("X-Content-Type-Options");
    expect(config).toContain("nosniff");
    expect(config).toContain("Referrer-Policy");
    expect(config).toContain("Permissions-Policy");
    expect(config).toContain("X-Frame-Options");
    expect(config).toContain("DENY");
    expect(config).toContain("Content-Security-Policy");
    expect(config).toContain("frame-ancestors 'none'");
  });

  it("keeps CSP tight (no broad wildcards or unused hosts)", () => {
    const config = read("next.config.ts");
    expect(config).toContain("https://*.supabase.co");
    expect(config).toContain("wss://*.supabase.co");
    expect(config).not.toContain("script-src *");
    expect(config).not.toContain("default-src *");
    expect(config).not.toMatch(/connect-src[^;]*https:\/\/\*(?!\.supabase\.co)/);
    expect(config).not.toContain("googleapis.com");
    expect(config).not.toContain("js.stripe.com");
    expect(config).not.toContain("unsafe-eval");
  });
});
