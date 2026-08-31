import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  META_BROWSER_EVENTS,
  META_PIXEL_PATH_ALLOWLIST,
  getPublicMetaPixelId,
  isMetaBrowserEventName,
  isMetaPixelSurface,
  sanitizeMetaBrowserParams,
} from "@/lib/meta/browser-events";

const root = process.cwd();

function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("meta pixel browser tracking", () => {
  it("keeps a strict event allowlist without Lead and rejects arbitrary params", () => {
    expect(META_BROWSER_EVENTS).toEqual(["PageView", "ViewContent"]);
    expect(isMetaBrowserEventName("Purchase")).toBe(false);
    expect(isMetaBrowserEventName("Lead")).toBe(false);

    const cleaned = sanitizeMetaBrowserParams("ViewContent", {
      content_name: "paid_landing",
      email: "no@example.com",
      tradition: "evangelica",
    } as never);
    expect(cleaned).toEqual({ content_name: "paid_landing" });
    expect(cleaned).not.toHaveProperty("email");
  });

  it("loads only on public funnel surfaces", () => {
    expect(isMetaPixelSurface("/comece")).toBe(true);
    expect(isMetaPixelSurface("/planos")).toBe(true);
    expect(isMetaPixelSurface("/cadastro")).toBe(true);
    expect(isMetaPixelSurface("/admin")).toBe(false);
    expect(isMetaPixelSurface("/conversar")).toBe(false);
    expect(isMetaPixelSurface("/jornadas")).toBe(false);
    expect(isMetaPixelSurface("/inicio")).toBe(false);
    expect(META_PIXEL_PATH_ALLOWLIST).not.toContain("/admin");
  });

  it("disables silently without pixel id env", () => {
    const previous = process.env.NEXT_PUBLIC_META_PIXEL_ID;
    delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
    expect(getPublicMetaPixelId()).toBeNull();
    process.env.NEXT_PUBLIC_META_PIXEL_ID = "not-digits";
    expect(getPublicMetaPixelId()).toBeNull();
    if (previous === undefined) delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
    else process.env.NEXT_PUBLIC_META_PIXEL_ID = previous;
  });

  it("does not emit Meta Lead from signup soft-success paths", () => {
    const gate = read("src", "components", "meta", "meta-pixel-gate.tsx");
    const loader = read("src", "lib", "meta", "pixel-loader.ts");
    const signup = read("src", "components", "auth", "sign-up-form.tsx");
    const lead = read("src", "lib", "meta", "track-lead.ts");
    const browserEvents = read("src", "lib", "meta", "browser-events.ts");

    expect(gate).toContain("advertisingGranted");
    expect(gate).toContain("trackMetaBrowserEvent");
    expect(gate).toContain("PageView");
    expect(gate).toContain('"/comece"');
    expect(gate).toContain("ViewContent");
    expect(loader).toContain('"init", pixelId');
    expect(loader).not.toContain("em=");
    expect(loader).not.toContain("external_id");
    expect(signup).not.toContain("trackMetaLeadAfterSignupSuccess");
    expect(browserEvents).not.toMatch(/"Lead"/);
    expect(lead).toMatch(/Intentionally no-op|disabled/i);
    expect(lead).not.toContain('trackMetaBrowserEvent');
  });

  it("keeps consent gate and sensitive-path exclusion after CSP unlock", () => {
    const gate = read("src", "components", "meta", "meta-pixel-gate.tsx");
    expect(gate).toContain("advertisingGranted");
    expect(gate).toContain("disableMetaPixelRuntime");
    expect(gate).toContain("isMetaPixelSurface");
    expect(isMetaPixelSurface("/assinatura/sucesso")).toBe(false);
    expect(isMetaPixelSurface("/conversas")).toBe(false);
    expect(isMetaPixelSurface("/conta")).toBe(false);
  });
});
