import { describe, expect, it } from "vitest";
import { resolveEntitlements } from "@/lib/entitlements";

describe("resolveEntitlements", () => {
  it("returns active plan entitlements for essencial", () => {
    const result = resolveEntitlements({ planKey: "essencial" });
    expect(result.has("chat_standard")).toBe(true);
    expect(result.has("chat_deep")).toBe(false);
    expect(result.has("reading_journeys")).toBe(false);
    // Reserved catalog keys must not grant at runtime.
    expect(result.has("short_memory")).toBe(false);
    expect(result.has("human_concierge")).toBe(false);
    expect(result.entitlements.every((k) => k === "chat_standard")).toBe(true);
  });

  it("grants deep and journeys for profundo without reserved keys", () => {
    const result = resolveEntitlements({ planKey: "profundo" });
    expect(result.has("chat_deep")).toBe(true);
    expect(result.has("reading_journeys")).toBe(true);
    expect(result.has("chat_standard")).toBe(true);
    expect(result.has("multiple_personas")).toBe(false);
    expect(result.has("extended_memory")).toBe(false);
    expect(result.has("voice_responses")).toBe(false);
    expect(result.entitlements).not.toContain("extended_memory");
    expect(result.entitlements).not.toContain("multiple_personas");
  });

  it("applies active overrides and revocations only", () => {
    const result = resolveEntitlements({
      planKey: "essencial",
      overrides: ["reading_journeys", "extended_memory"],
      revoked: ["chat_standard"],
    });
    expect(result.has("reading_journeys")).toBe(true);
    expect(result.has("extended_memory")).toBe(false);
    expect(result.has("chat_standard")).toBe(false);
  });

  it("does not treat particular reserved concierge flags as granted", () => {
    const result = resolveEntitlements({ planKey: "particular" });
    expect(result.has("chat_standard")).toBe(true);
    expect(result.has("chat_deep")).toBe(true);
    expect(result.has("reading_journeys")).toBe(true);
    expect(result.has("human_concierge")).toBe(false);
    expect(result.has("whatsapp_access")).toBe(false);
    expect(result.has("custom_content")).toBe(false);
  });
});
