import { describe, expect, it } from "vitest";
import { resolveEntitlements } from "@/lib/entitlements";

describe("resolveEntitlements", () => {
  it("returns plan entitlements for essencial", () => {
    const result = resolveEntitlements({ planKey: "essencial" });
    expect(result.has("chat_standard")).toBe(true);
    expect(result.has("short_memory")).toBe(true);
    expect(result.has("chat_deep")).toBe(false);
    expect(result.has("human_concierge")).toBe(false);
  });

  it("includes deep and personas for profundo", () => {
    const result = resolveEntitlements({ planKey: "profundo" });
    expect(result.has("chat_deep")).toBe(true);
    expect(result.has("multiple_personas")).toBe(true);
    expect(result.has("extended_memory")).toBe(true);
  });

  it("applies overrides and revocations", () => {
    const result = resolveEntitlements({
      planKey: "essencial",
      overrides: ["reading_journeys"],
      revoked: ["short_memory"],
    });
    expect(result.has("reading_journeys")).toBe(true);
    expect(result.has("short_memory")).toBe(false);
  });

  it("gives particular all concierge entitlements", () => {
    const result = resolveEntitlements({ planKey: "particular" });
    expect(result.has("human_concierge")).toBe(true);
    expect(result.has("whatsapp_access")).toBe(true);
    expect(result.has("custom_content")).toBe(true);
  });
});
