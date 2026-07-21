import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildSupportMailto,
  HELP_FAQ,
  SUPPORT_CATEGORIES,
} from "@/lib/support/help-center";

describe("help center & support intake V1", () => {
  it("covers operational categories without pastoral WhatsApp", () => {
    expect(SUPPORT_CATEGORIES.map((c) => c.id)).toEqual(
      expect.arrayContaining([
        "acesso",
        "cobranca",
        "jornadas",
        "cancelamento",
        "tecnico",
      ]),
    );
    expect(HELP_FAQ.some((f) => /jesus/i.test(f.a))).toBe(true);
    expect(HELP_FAQ.every((f) => !/whatsapp.*(oração|reflexão)/i.test(f.a))).toBe(
      true,
    );
  });

  it("builds mailto with category subject and no card/spiritual dump prompt", () => {
    const href = buildSupportMailto("tecnico");
    expect(href).toMatch(/^mailto:/);
    expect(href).toContain(encodeURIComponent("[Amém Chat] Problema técnico"));
    expect(decodeURIComponent(href!)).toMatch(/não inclua o conteúdo completo/i);
    expect(decodeURIComponent(href!)).toMatch(/dados de cartão/i);
  });

  it("ships public /ajuda page and sitemap entry", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(marketing)/ajuda/page.tsx"),
      "utf8",
    );
    const sitemap = readFileSync(
      join(process.cwd(), "src/app/sitemap.ts"),
      "utf8",
    );
    const footer = readFileSync(
      join(process.cwd(), "src/components/marketing/site-chrome.tsx"),
      "utf8",
    );
    expect(page).toContain("Falar com o suporte");
    expect(page).toContain("não é aconselhamento pastoral");
    expect(sitemap).toContain('"/ajuda"');
    expect(footer).toContain('href="/ajuda"');
  });
});
