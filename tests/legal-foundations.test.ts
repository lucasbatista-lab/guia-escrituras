import { describe, expect, it } from "vitest";
import {
  getLegalEntityDocument,
  getLegalEntityName,
  getPrivacyVersion,
  getTermsVersion,
  LEGAL_ROUTES,
} from "@/config/legal";

describe("legal versions", () => {
  it("exposes default versions", () => {
    expect(getTermsVersion()).toBeTruthy();
    expect(getPrivacyVersion()).toBeTruthy();
  });
});

describe("optional legal entity", () => {
  const original = { ...process.env };

  it("does not invent CNPJ or entity when unset", () => {
    delete process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME;
    delete process.env.NEXT_PUBLIC_LEGAL_ENTITY_DOCUMENT;
    expect(getLegalEntityName()).toBeNull();
    expect(getLegalEntityDocument()).toBeNull();
    process.env = { ...original };
  });
});

describe("public legal routes", () => {
  it("includes all required pages", () => {
    const hrefs = LEGAL_ROUTES.map((r) => r.href);
    expect(hrefs).toContain("/termos");
    expect(hrefs).toContain("/privacidade");
    expect(hrefs).toContain("/transparencia-ia");
    expect(hrefs).toContain("/cancelamento");
    expect(hrefs).toContain("/uso-justo");
  });
});

describe("footer legal links", () => {
  it("renders legal routes in site chrome", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/components/marketing/site-chrome.tsx", "utf8"),
    );
    expect(source).toContain("LEGAL_ROUTES");
    expect(source).toContain('aria-label="Documentos legais"');
  });
});

describe("signup form terms checkbox", () => {
  it("always shows terms acceptance with links", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/components/auth/sign-up-form.tsx", "utf8"),
    );
    expect(source).toContain("Li e aceito");
    expect(source).toContain('href="/termos"');
    expect(source).toContain('href="/privacidade"');
    expect(source).toContain("aria-required");
    expect(source).not.toContain("requireTerms");
    expect(source).toContain("termsAccepted");
  });
});

describe("home page honesty", () => {
  it("does not claim divine identity or fake testimonials", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/app/(marketing)/page.tsx", "utf8"),
    );
    expect(source).toContain("inteligência artificial");
    expect(source).not.toMatch(/depoimento|testemunho fictício|usuários ativos:/i);
    expect(source).not.toMatch(/fale com o verdadeiro Jesus/i);
  });
});
