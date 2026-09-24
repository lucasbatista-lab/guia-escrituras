import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("APP FEEL interaction system", () => {
  it("exposes motion tokens FAST/NORMAL/RITUAL with reduced-motion collapse", () => {
    const css = read("src", "app", "globals.css");
    expect(css).toContain("--amem-dur-fast: 160ms");
    expect(css).toContain("--amem-dur-normal: 260ms");
    expect(css).toContain("--amem-dur-ritual: 420ms");
    expect(css).toContain("--amem-ease-settle");
    expect(css).toContain(".amem-press");
    expect(css).toContain(".amem-enter-soft");
    expect(css).toContain(".amem-complete-material");
    expect(css).toContain(".amem-type-context");
    expect(css).toContain(".amem-type-moment");
    expect(css).toMatch(
      /prefers-reduced-motion:\s*reduce[\s\S]*--amem-dur-ritual:\s*1ms/,
    );
  });

  it("ships minimal interaction primitives without heavy deps", () => {
    const files = [
      ["src", "components", "interaction", "motion.tsx"],
      ["src", "components", "interaction", "completion-feedback.tsx"],
      ["src", "components", "interaction", "icon-action.tsx"],
    ];
    for (const parts of files) {
      const src = read(...parts);
      expect(src.length).toBeGreaterThan(40);
      expect(src).not.toMatch(/framer-motion|react-spring|gsap/i);
    }
    const pkg = read("package.json");
    expect(pkg).not.toMatch(/"framer-motion"/);
  });

  it("Button includes tactile press + ≥44px default hit target", () => {
    const button = read("src", "components", "ui", "button.tsx");
    expect(button).toContain("amem-press");
    expect(button).toContain("min-h-11");
    expect(button).toContain("ritual:");
  });

  it("Hoje applies phase motion and complete hierarchy (one primary)", () => {
    const ritual = read("src", "components", "daily", "hoje-ritual.tsx");
    expect(ritual).toContain("SoftEnter");
    expect(ritual).toContain("CompletionFeedback");
    expect(ritual).toContain('data-hoje-phase="start"');
    expect(ritual).toContain('data-hoje-phase="mid"');
    expect(ritual).toContain('data-hoje-phase="complete"');
    expect(ritual).toContain("Você esteve presente.");
    expect(ritual).toMatch(/>\s*Início\s*</);
    expect(ritual).toContain("Compartilhar");
    // Primary next is Conversar (ritual); back is quiet text link — not competing
    const completeIdx = ritual.indexOf('data-hoje-phase="complete"');
    const complete = ritual.slice(completeIdx);
    const conversarRitual = complete.indexOf('variant="ritual"');
    const voltar = complete.indexOf('href="/inicio"');
    expect(conversarRitual).toBeGreaterThan(-1);
    expect(voltar).toBeGreaterThan(conversarRitual);
    expect(ritual).not.toMatch(/confetti/i);
  });

  it("Caminhos stage swap + Continuar primary; Espaço delete never primary", () => {
    const guided = read("src", "components", "journeys", "journey-day-guided.tsx");
    expect(guided).toContain("SoftSwap");
    expect(guided).toContain("Continuar");
    expect(guided).toContain("amem-type-action");
    const journal = read("src", "components", "workspace", "journal-workspace.tsx");
    const prayer = read("src", "components", "workspace", "prayer-workspace.tsx");
    expect(journal).toContain("amem-highlight-once");
    expect(journal).toContain("amem-remove-out");
    expect(prayer).toContain("amem-highlight-once");
    expect(prayer).toContain("Confirmar exclusão");
    // Confirm delete is outline+destructive, not ritual primary
    const jConfirm = journal.slice(
      Math.max(0, journal.indexOf("Confirmar exclusão") - 420),
      journal.indexOf("Confirmar exclusão") + 40,
    );
    expect(jConfirm).toContain('variant="outline"');
    expect(jConfirm).not.toContain('variant="ritual"');
    const pConfirm = prayer.slice(
      Math.max(0, prayer.indexOf("Confirmar exclusão") - 420),
      prayer.indexOf("Confirmar exclusão") + 40,
    );
    expect(pConfirm).toContain('variant="outline"');
    expect(pConfirm).not.toContain('variant="ritual"');
  });

  it("bottom nav has press feedback; platform page-enter template exists", () => {
    const nav = read("src", "components", "platform", "platform-nav.tsx");
    expect(nav).toContain("amem-press");
    expect(nav).toContain("amem-nav-active-pill");
    const template = read("src", "app", "(platform)", "template.tsx");
    expect(template).toContain("amem-page-enter");
  });

  it("public home ATF is single-CTA; auth shells keep hierarchy polish", () => {
    const home = read("src", "app", "(marketing)", "page.tsx");
    const hero = home.slice(
      home.indexOf("/* 1. Hero"),
      home.indexOf("/* 2. Demonstração"),
    );
    expect(hero).toContain("Criar conta grátis");
    expect(hero).toContain("<ProductHeroPreview");
    expect(hero).not.toContain('href="/planos"');
    expect(hero).not.toContain('href="#demonstracao"');
    const auth = read("src", "components", "auth", "auth-shell.tsx");
    expect(auth).toContain("amem-enter-soft");
    expect(auth).toContain("max-w-md");
  });
});
