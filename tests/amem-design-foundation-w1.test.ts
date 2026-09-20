import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("W1 / Wave 3A V17 porcelain visual system", () => {
  it("globals expose V17 canvas/surface/ink/wine/brass tokens", () => {
    const css = read("src", "app", "globals.css");
    for (const token of [
      "--amem-canvas: #F7F5F1",
      "--amem-surface: #FFFDFC",
      "--amem-ink: #191613",
      "--amem-wine: #5A2232",
      "--amem-wine-deep: #3A1520",
      "--amem-plum: #6B3A4A",
      "--amem-brass: #B8965A",
      "--amem-cta-ritual",
      "--amem-trilho-thickness: 3.5px",
      "--amem-nav-bg",
      "--amem-text-body",
      "--amem-dur-ritual",
      "--amem-ease-presence",
    ]) {
      expect(css).toContain(token);
    }
    expect(css).toContain("font-size: var(--amem-text-body)");
    // No peach/coral wash as default ambient
    expect(css).not.toMatch(/peach|coral|#F3EBE0/);
  });

  it("reduced motion collapses amem durations and splash", () => {
    const css = read("src", "app", "globals.css");
    expect(css).toMatch(
      /prefers-reduced-motion:\s*reduce[\s\S]*--amem-dur-ritual:\s*1ms/,
    );
    expect(css).toContain("amem-splash-sig");
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

  it("button exposes ritual/premium/ghost + gold alias (not pure-black default)", () => {
    const button = read("src", "components", "ui", "button.tsx");
    expect(button).toContain("ritual:");
    expect(button).toContain("premium:");
    expect(button).toContain("soft:");
    expect(button).toContain("gold:");
    expect(button).toContain("amem-btn-ritual");
    expect(button).toContain("amem-btn-premium");
    expect(button).not.toMatch(/default:[\s\S]*bg-black/);
  });
});
