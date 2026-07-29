import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

function read(...parts: string[]) {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

describe("safe PWA foundation", () => {
  it("starts in the guarded subscriber area with standalone identity", () => {
    const value = manifest();
    expect(value.start_url).toBe("/inicio");
    expect(value.scope).toBe("/");
    expect(value.display).toBe("standalone");
    expect(value.theme_color).toBe("#6b2e3a");
    expect(value.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: "192x192", type: "image/png" }),
        expect.objectContaining({ sizes: "512x512", type: "image/png" }),
      ]),
    );
  });

  it("keeps installation optional and honest", () => {
    const panel = read(
      "src",
      "components",
      "account",
      "install-app-panel.tsx",
    );
    expect(panel).toContain("beforeinstallprompt");
    expect(panel).toContain("Adicionar à Tela de Início");
    expect(panel).toContain("não disponibiliza conversas offline");
    expect(panel).not.toContain("App Store");
  });

  it("does not introduce authenticated or API caching", () => {
    const manifestSource = read("src", "app", "manifest.ts");
    const iconRoute = read("src", "app", "pwa-icon", "route.tsx");
    expect(manifestSource).not.toContain("serviceWorker");
    expect(iconRoute).not.toContain("/api/");
    expect(iconRoute).not.toContain("caches.");
  });
});
