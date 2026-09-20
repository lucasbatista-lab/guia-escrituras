import { describe, expect, it } from "vitest";
import { readFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  parseDailyImportFile,
  validateDailyImportRecords,
  toDailyContent,
  mergeDailyCatalog,
  writeDailyCatalog,
  dailyCoverageReport,
} from "@/lib/daily/editorial/pipeline";
import { getPlatformNavItemsForState } from "@/lib/journey/journey-state";

function read(...parts: string[]) {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

const validRow = {
  publish_date: "2026-10-01",
  theme: "paz",
  title: "Um dia em paz",
  scripture_book: "João",
  scripture_chapter: 14,
  scripture_start_verse: 27,
  scripture_end_verse: 27,
  scripture_paraphrase: "A paz de Cristo não é a paz do mundo.",
  reflection: "Há um convite a receber paz sem negar o conflito real do dia.",
  prayer: "Senhor, guarda o meu coração hoje. Amém.",
  action: "Respire fundo e diga em voz alta um versículo de paz.",
};

describe("free public product alignment", () => {
  it("signup without plan is a free path, paid plan copy stays", () => {
    const page = read("src", "app", "(auth)", "cadastro", "page.tsx");
    expect(page).toContain('variant={plan ? "paid" : "free"}');
    expect(page).toContain("Sem cartão");
    expect(page).not.toContain("Depois você escolhe o plano e confirma o pagamento");
    expect(page).toContain("Você escolheu o plano");
    const steps = read("src", "components", "marketing", "purchase-journey-steps.tsx");
    expect(steps).toContain('"free"');
    expect(steps).toContain("Hoje com Deus");
    expect(steps).toContain("Confirmar e-mail");
    const checkEmail = read("src", "app", "(auth)", "confira-seu-email", "page.tsx");
    expect(checkEmail).toContain('variant={planKey ? "paid" : "free"}');
    const confirmed = read("src", "app", "(auth)", "email-confirmado", "page.tsx");
    expect(confirmed).toContain('hasPlan ? "paid" : "free"');
  });

  it("home and chrome offer a free CTA without calling it a trial", () => {
    const home = read("src", "app", "(marketing)", "page.tsx");
    const chrome = read("src", "components", "marketing", "site-chrome.tsx");
    expect(home).toContain("Criar conta grátis");
    expect(home).not.toMatch(/teste grátis/i);
    expect(chrome).toContain("Criar conta grátis");
    expect(chrome).toContain('href="/cadastro"');
  });

  it("cookie banner keeps accept/refuse/configure in a compact 3-col grid", () => {
    const banner = read("src", "components", "consent", "consent-banner.tsx");
    expect(banner).toContain("CONSENT_COPY.accept");
    expect(banner).toContain("CONSENT_COPY.refuse");
    expect(banner).toContain("CONSENT_COPY.configure");
    expect(banner).toContain("grid-cols-3");
    expect(banner).toContain("campaignCompact");
    expect(banner).toContain("Saiba mais");
    expect(banner).toContain("pb-[max(0.25rem,var(--safe-bottom))]");
  });

  it("keeps /comece out of the sitemap as a campaign landing", () => {
    const sitemap = read("src", "app", "sitemap.ts");
    expect(sitemap).not.toContain('"/comece"');
    expect(sitemap).toContain("campaign");
    const comece = read("src", "app", "(marketing)", "comece", "page.tsx");
    expect(comece).toContain("index: false");
  });

  it("FREE still cannot chat", () => {
    expect(getPlatformNavItemsForState("confirmed_without_plan").map((i) => i.href)).not.toContain(
      "/conversar",
    );
  });
});

describe("daily editorial pipeline", () => {
  it("rejects duplicates, empty required fields, and scripture_text", () => {
    const { records } = parseDailyImportFile(JSON.stringify([validRow, validRow]));
    const issues = validateDailyImportRecords(records);
    expect(issues.some((i) => i.field === "publish_date")).toBe(true);

    expect(
      validateDailyImportRecords([{ ...validRow, reflection: "" }]).some(
        (i) => i.field === "reflection",
      ),
    ).toBe(true);

    expect(
      validateDailyImportRecords([
        { ...validRow, scripture_text: "texto de tradução moderna" },
      ]).some((i) => i.field === "scripture_text"),
    ).toBe(true);

    expect(
      validateDailyImportRecords([
        { ...validRow, status: "ready" } as typeof validRow & { status: string },
      ]).some((i) => i.field === "status"),
    ).toBe(true);

    expect(
      validateDailyImportRecords([
        { ...validRow, related_checkin: "panic" },
      ]).some((i) => i.field === "related_checkin"),
    ).toBe(true);
  });

  it("imports upsert by date and supports dry-run", () => {
    const incoming = [toDailyContent(validRow)];
    const merged = mergeDailyCatalog(incoming, [
      { ...incoming[0]!, title: "Atualizado" },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.title).toBe("Atualizado");

    const dir = mkdtempSync(join(tmpdir(), "daily-cat-"));
    const file = join(dir, "imported.json");
    expect(writeDailyCatalog(file, merged, true)).toEqual({
      written: false,
      count: 1,
    });
    writeDailyCatalog(file, merged, false);
    const roundtrip = JSON.parse(readFileSync(file, "utf8"));
    expect(roundtrip).toHaveLength(1);
  });

  it("coverage reports missing future dates", () => {
    const report = dailyCoverageReport([], "2026-09-20", 3);
    expect(report.today).toBe("2026-09-20");
    expect(report.missingDates).toEqual([
      "2026-09-20",
      "2026-09-21",
      "2026-09-22",
    ]);
  });

  it("CLI script is dry-run safe and has no service role in browser code", () => {
    const cli = read("scripts", "content-daily.cjs");
    expect(cli).toContain("--dry-run");
    expect(cli).toContain("scripture_text rejeitado");
    expect(cli).not.toContain("NEXT_PUBLIC_SUPABASE_SECRET");
  });
});
