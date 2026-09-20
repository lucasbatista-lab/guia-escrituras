import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("W1 editorial presence design foundation", () => {
  it("globals expose V13 canvas/cream/wine/gold/ink tokens", () => {
    const css = read("src", "app", "globals.css");
    for (const token of [
      "--amem-canvas",
      "--amem-cream-50",
      "--amem-wine-700",
      "--amem-gold-500",
      "--amem-ink-900",
      "--amem-premium-badge-bg",
      "--amem-lock-scrim",
      "--amem-text-body",
      "--amem-dur-ritual",
      "--amem-ease-presence",
    ]) {
      expect(css).toContain(token);
    }
    expect(css).toContain("font-size: var(--amem-text-body)");
    expect(css).toContain("Gold = editorial/spiritual accent (NOT premium-only)");
  });

  it("reduced motion collapses amem durations", () => {
    const css = read("src", "app", "globals.css");
    expect(css).toMatch(
      /prefers-reduced-motion:\s*reduce[\s\S]*--amem-dur-ritual:\s*1ms/,
    );
  });

  it("brand primitives exist without PNG imports", () => {
    const files = [
      ["src", "components", "brand", "presence-light.tsx"],
      ["src", "components", "brand", "paper-grain.tsx"],
      ["src", "components", "brand", "ritual-marker.tsx"],
      ["src", "components", "brand", "presence-pulse.tsx"],
      ["src", "components", "content", "scripture-ref.tsx"],
      ["src", "components", "surfaces", "scene.tsx"],
      ["src", "components", "surfaces", "editorial.tsx"],
      ["src", "components", "surfaces", "field.tsx"],
      ["src", "components", "surfaces", "list-row.tsx"],
    ];
    for (const parts of files) {
      const src = read(...parts);
      expect(src).not.toMatch(/\.(png|jpg|webp)/i);
      expect(src.length).toBeGreaterThan(40);
    }
  });

  it("button exposes soft and gold variants (gold = plan door, not premium-only semantics)", () => {
    const button = read("src", "components", "ui", "button.tsx");
    expect(button).toContain("soft:");
    expect(button).toContain("gold:");
    expect(button).toContain("--amem-gold-500");
  });

  it("does not redesign inicio/hoje/espaco/chat/jornada page compositions in W1", () => {
    // Foundation-only commit should not rewrite living screens.
    // Soft paywall gate lines are W0; W1 should not replace inicio composition.
    const inicio = read("src", "app", "(platform)", "inicio", "page.tsx");
    expect(inicio).toContain("DailyHomeSection");
    expect(inicio).not.toContain("SurfaceScene");
  });
});
