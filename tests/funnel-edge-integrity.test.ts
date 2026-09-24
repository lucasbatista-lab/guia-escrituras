import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PUBLIC_CONVERSION_EVENTS } from "@/lib/acquisition/public-event-types";
import { resolveFirstPremiumPath } from "@/lib/billing/first-premium-path";

const root = process.cwd();
function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("EXECUTION B funnel integrity + first value", () => {
  it("includes signup_email_sent between signup_started and paid events", () => {
    const iStarted = PUBLIC_CONVERSION_EVENTS.indexOf("signup_started");
    const iEmail = PUBLIC_CONVERSION_EVENTS.indexOf("signup_email_sent");
    expect(iStarted).toBeGreaterThanOrEqual(0);
    expect(iEmail).toBe(iStarted + 1);
  });

  it("fires signup_email_sent only after accepted signup needing confirmation", () => {
    const action = read("src", "lib", "auth", "sign-up-action.ts");
    expect(action).toContain("needsEmailConfirmation");
    expect(action).toMatch(
      /if \(needsEmailConfirmation\) \{\s*void recordSignupEmailSent/,
    );
  });

  it("uses opaque ses_ event_id without PII", () => {
    const rec = read("src", "lib", "acquisition", "record-signup-email-sent.ts");
    expect(rec).toContain("ses_");
    expect(rec).toContain("persistPublicConversionEvent");
    expect(rec.toLowerCase()).not.toContain("password");
    expect(rec).not.toMatch(/\bemailMasked\b|\bnormalizedEmail\b/);
  });

  it("guides free confirmation to Hoje as first value", () => {
    const confirmed = read(
      "src",
      "components",
      "auth",
      "email-confirmed-experience.tsx",
    );
    expect(confirmed).toContain('href={hasPlan ? continueHref : "/hoje"}');
    expect(confirmed).toContain("Começar pelo Hoje");
  });

  it("routes first premium value by plan after checkout", () => {
    expect(resolveFirstPremiumPath("essencial", true)).toBe("/conversar");
    expect(resolveFirstPremiumPath("profundo", true)).toBe("/conversar");
    expect(resolveFirstPremiumPath("caminho", true)).toBe("/jornadas");
    expect(resolveFirstPremiumPath("essencial", false)).toBe("/personalizar");
    expect(resolveFirstPremiumPath(null, true)).toBe("/inicio");
  });

  it("additive migration 018 only updates conversion event allowlist", () => {
    const sql = read(
      "supabase",
      "migrations",
      "20260924000018_public_conversion_signup_email_sent.sql",
    );
    expect(sql).toContain("signup_email_sent");
    expect(sql).toContain("public_conversion_events_event_name_allowed");
    expect(sql).not.toMatch(/drop table|create table public\./i);
  });
});

describe("EXECUTION B loading + recovery + a11y contracts", () => {
  it("ships structural skeletons for core platform routes", () => {
    for (const route of ["hoje", "inicio", "conversar", "espaco", "conta"]) {
      expect(
        read("src", "app", "(platform)", route, "loading.tsx"),
      ).toContain("PlatformSkeleton");
    }
  });

  it("preserves chat input on retryable failures and crisis priority", () => {
    const errors = read("src", "lib", "ai", "chat-client-errors.ts");
    expect(errors).toContain("keepPendingRequest: true");
    expect(errors).toContain("Sua mensagem continua aqui");
    const panel = read("src", "components", "chat", "chat-panel.tsx");
    expect(panel).toContain("Preparando uma resposta com cuidado");
    expect(panel).toContain('aria-busy="true"');
  });

  it("shows ConnectionNotice without offline-sync promises", () => {
    const notice = read(
      "src",
      "components",
      "platform",
      "connection-notice.tsx",
    );
    expect(notice).toContain("Sem conexão");
    expect(notice.toLowerCase()).not.toContain("sincroniz");
    const layout = read("src", "app", "(platform)", "layout.tsx");
    expect(layout).toContain("ConnectionNotice");
    expect(layout).toContain("force-dynamic is REQUIRED");
  });

  it("raises bottom-nav label size and keeps touch targets", () => {
    const nav = read("src", "components", "platform", "platform-nav.tsx");
    expect(nav).toContain("text-[13px]");
    expect(nav).not.toContain("text-[12px]");
    expect(nav).toContain("min-h-11");
    expect(nav).toContain("min-w-[44px]");
  });

  it("collapses Execution A motion under prefers-reduced-motion", () => {
    const css = read("src", "app", "globals.css");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain(".animate-fade-up-delayed");
  });
});
