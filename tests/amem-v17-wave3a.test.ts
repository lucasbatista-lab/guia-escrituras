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
    expect(card.toLowerCase()).not.toContain("orange");
    expect(card.toLowerCase()).not.toContain("coral");
    expect(card.toLowerCase()).not.toContain("peach");
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

describe("Wave 3A.1 mobile shell / icons / share export", () => {
  it("hides sticky mobile wordmark when bottom nav is active", () => {
    const nav = read("src", "components", "platform", "platform-nav.tsx");
    expect(nav).toContain("showBottomNav");
    expect(nav).toContain("pt-safe");
    // Desktop sidebar keeps brand wordmark
    expect(nav).toContain("brand.name");
    expect(nav).toContain("md:flex");
    // Conversar keeps floating bottom nav; no sticky Amém Chat header
    expect(nav).toMatch(/showBottomNav \?[\s\S]*pt-safe/);
    expect(nav).not.toContain("isChat");
    expect(nav).toContain("showBottomNav && bottomTabs");
  });

  it("uses V15 custom nav icons instead of Lucide Home/Sparkles/Waypoints", () => {
    const nav = read("src", "components", "platform", "platform-nav.tsx");
    const icons = read("src", "components", "platform", "nav-icons.tsx");
    expect(nav).toContain("NavIconInicio");
    expect(nav).toContain("NavIconHoje");
    expect(nav).toContain("NavIconCaminhos");
    expect(nav).toContain("NavIconEspaco");
    expect(nav).toContain("NavIconConversar");
    expect(nav).toContain("NavIconMenu");
    expect(nav).not.toMatch(/from "lucide-react"[\s\S]*Home/);
    expect(nav).not.toContain("Waypoints");
    expect(nav).not.toContain("Sparkles");
    expect(icons).toContain("strokeWidth=\"1.7\"");
    expect(icons).toContain("NavIconCaminhos");
  });

  it("exports standalone share card without app shell", () => {
    const exporter = read("src", "lib", "share", "export-presence-card.ts");
    const qa = read("src", "app", "dev", "amem-w2-qa", "page.tsx");
    expect(exporter).toContain("renderPresenceShareCard");
    expect(exporter).toContain("sharePresenceShareCard");
    expect(exporter).toContain("story");
    expect(exporter).toContain("square");
    expect(exporter).toMatch(/1080/);
    expect(exporter).toMatch(/1920/);
    expect(qa).toContain("data-amem-share-standalone");
    expect(qa).toContain("SharePresenceActions");
    // share fixture must not wrap card in Shell (no header/nav in exported preview)
    expect(qa).toMatch(/case "share":[\s\S]*data-amem-share-standalone/);
    expect(qa).not.toMatch(/case "share":[\s\S]*<Shell[\s\S]*PresenceShareCard/);
  });

  it("soft paywall overlay sits above bottom nav and inerts it", () => {
    const sheet = read("src", "components", "commerce", "soft-paywall-sheet.tsx");
    const css = read("src", "app", "globals.css");
    expect(sheet).toContain('z-[100]');
    expect(sheet).toContain('z-[110]');
    expect(sheet).toContain("amemSheet");
    expect(css).toContain('data-amem-sheet="open"');
    expect(css).toContain("pointer-events: none");
  });
});
