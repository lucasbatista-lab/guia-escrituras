import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("Wave 3A V17 brand splash share paywall nav", () => {
  it("floating bottom nav uses porcelain pill + wine active", () => {
    const nav = read("src", "components", "platform", "platform-nav.tsx");
    expect(nav).toContain("amem-bottom-nav-float");
    expect(nav).toContain("amem-nav-active-pill");
    expect(nav).toContain("min-h-11");
    expect(nav).toContain("min-w-[44px]");
  });

  it("splash uses honesty A/B with reduced-motion honor and simple persist", () => {
    const splash = read("src", "components", "brand", "amem-splash.tsx");
    expect(splash).toContain("Não é Jesus, pastor, terapeuta nem a voz de Deus");
    expect(splash).toContain("Presença com limites honestos");
    expect(splash).toContain("amem.splash.seen");
    expect(splash).toContain("prefers-reduced-motion");
    expect(splash).toContain("amem-splash-sig");
    const host = read("src", "components", "brand", "amem-splash-host.tsx");
    expect(host).toContain("AmemSplash");
    const layout = read("src", "app", "(platform)", "layout.tsx");
    expect(layout).toContain("AmemSplashHost");
  });

  it("share card is dusk wine→plum with brass mark only", () => {
    const card = read("src", "components", "share", "presence-share-card.tsx");
    expect(card).toContain("amem-dusk");
    expect(card).toContain("data-amem-share-card");
    expect(card).toContain("brass");
    expect(card).not.toMatch(/orange|#FF|coral|peach/i);
  });

  it("QA fixtures stay on /dev/amem-w2-qa and fail-closed", () => {
    const qa = read("src", "app", "dev", "amem-w2-qa", "page.tsx");
    expect(qa).toContain("allowsMocks");
    expect(qa).toContain("notFound");
    expect(qa).toContain("inicio-free");
    expect(qa).toContain("inicio-paid");
    expect(qa).toContain("hoje-mid");
    expect(qa).toContain("hoje-complete");
    expect(qa).toContain("espaco-empty");
    expect(qa).toContain("espaco-populated");
    expect(qa).toContain("splash");
    expect(qa).toContain("share");
    expect(qa).toContain("paywall");
  });
});
