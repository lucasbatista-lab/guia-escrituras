import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("W4 Hoje presence ritual", () => {
  it("exposes START / MID / COMPLETE phases without confetti or streaks", () => {
    const ritual = read("src", "components", "daily", "hoje-ritual.tsx");
    expect(ritual).toContain('data-hoje-phase="start"');
    expect(ritual).toContain('data-hoje-phase="mid"');
    expect(ritual).toContain('data-hoje-phase="complete"');
    expect(ritual).toContain("Chego");
    expect(ritual).toContain("Escuto");
    expect(ritual).toContain("Olho");
    expect(ritual).toContain("Falo");
    expect(ritual).toContain("Pratico");
    expect(ritual).toContain("Levo");
    expect(ritual).toContain("Amém.");
    expect(ritual).toContain("PresenceLight");
    expect(ritual).toContain("PresencePulse");
    expect(ritual).not.toMatch(/confetti|streak|dias seguidos|culpa/i);
  });

  it("keeps save / share / check-in and never paywalls the basic ritual", () => {
    const ritual = read("src", "components", "daily", "hoje-ritual.tsx");
    expect(ritual).toContain("/api/daily/interaction");
    expect(ritual).toContain("checkin");
    expect(ritual).toContain("saved: true");
    expect(ritual).toContain("shared: true");
    expect(ritual).toContain("completed: true");
    expect(ritual).not.toContain("SoftPaywall");
    expect(ritual).not.toContain("openai");
    expect(ritual).not.toContain("/api/chat");
  });

  it("wires HojeRitual into DailyHomeSection for /hoje", () => {
    const section = read("src", "components", "daily", "daily-home-section.tsx");
    expect(section).toContain("HojeRitual");
    expect(section).not.toContain("HojeComDeusCard");
    const page = read("src", "app", "(platform)", "hoje", "page.tsx");
    expect(page).toContain("DailyHomeSection");
  });

  it("complete state offers share and return to inicio", () => {
    const ritual = read("src", "components", "daily", "hoje-ritual.tsx");
    expect(ritual).toContain('href="/inicio"');
    expect(ritual).toContain("Compartilhar");
    expect(ritual).toContain("Voltar ao Início");
  });
});
