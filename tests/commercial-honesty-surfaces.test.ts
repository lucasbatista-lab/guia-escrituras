import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CROSS_SURFACE_COMMERCIAL_FAQ,
  PLAN_CHANGE_FAQ,
  PLAN_COMMERCIAL_FAQ,
} from "@/lib/marketing/plan-faq";
import { HELP_FAQ } from "@/lib/support/help-center";

describe("commercial honesty across surfaces", () => {
  it("keeps plan-change, Aprofundar, and Jornadas answers identical", () => {
    for (const item of CROSS_SURFACE_COMMERCIAL_FAQ) {
      expect(PLAN_COMMERCIAL_FAQ.some((f) => f.q === item.q && f.a === item.a)).toBe(
        true,
      );
      expect(HELP_FAQ.some((f) => f.q === item.q && f.a === item.a)).toBe(true);
    }
    expect(PLAN_CHANGE_FAQ.a).toMatch(/troca automática.*não está disponível/i);
  });

  it("home FAQ imports the shared commercial honesty set", () => {
    const home = readFileSync(
      join(process.cwd(), "src/app/(marketing)/page.tsx"),
      "utf8",
    );
    expect(home).toContain("CROSS_SURFACE_COMMERCIAL_FAQ");
    expect(home).not.toMatch(/troca automática entre planos ainda não/);
  });

  it("help billing FAQ does not imply portal plan changes", () => {
    const billing = HELP_FAQ.find((f) =>
      /onde vejo ou altero minha assinatura/i.test(f.q),
    );
    expect(billing?.a).toMatch(/troca automática.*não está disponível/i);
  });
});
