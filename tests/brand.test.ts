import { describe, expect, it, afterEach } from "vitest";
import { getBrandConfig } from "@/config/brand";

describe("brand config", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("defaults to Amém Chat", () => {
    delete process.env.NEXT_PUBLIC_APP_NAME;
    delete process.env.NEXT_PUBLIC_APP_TAGLINE;
    const brand = getBrandConfig();
    expect(brand.name).toBe("Amém Chat");
    expect(brand.tagline).toBe("Como Jesus responderia à sua situação?");
    expect(brand.description).toContain("guIA cristão");
  });

  it("allows env overrides", () => {
    process.env.NEXT_PUBLIC_APP_NAME = "Test Brand";
    process.env.NEXT_PUBLIC_APP_TAGLINE = "Tag custom";
    process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE = "@custom";
    const brand = getBrandConfig();
    expect(brand.name).toBe("Test Brand");
    expect(brand.tagline).toBe("Tag custom");
    expect(brand.socialHandles.instagram).toBe("custom");
  });
});
