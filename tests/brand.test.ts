import { describe, expect, it, afterEach } from "vitest";
import { snapshotEnv, restoreEnv } from "./helpers/env";
import { getBrandConfig } from "@/config/brand";
import { getSupportEmail } from "@/config/legal";

describe("brand config", () => {
  const original = snapshotEnv();

  afterEach(() => {
    restoreEnv(original);
  });

  it("defaults to Amém Chat", () => {
    delete process.env.NEXT_PUBLIC_APP_NAME;
    delete process.env.NEXT_PUBLIC_APP_TAGLINE;
    delete process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
    delete process.env.NEXT_PUBLIC_APP_SUPPORT_EMAIL;
    const brand = getBrandConfig();
    expect(brand.name).toBe("Amém Chat");
    expect(brand.tagline).toBe(
      "Clareza à luz das Escrituras para o que você está vivendo.",
    );
    expect(brand.description).toMatch(/situações reais/i);
    expect(brand.description).toMatch(/inteligência artificial/i);
    expect(brand.description).toMatch(/limites honestos/i);
    expect(brand.seoTitle).toContain("Amém Chat");
    expect(brand.seoTitle).toContain("situações reais");
    expect(brand.seoDescription).toMatch(/inteligência artificial/i);
    expect(brand.seoDescription).not.toMatch(/fale diretamente com Jesus/i);
    expect(brand.supportEmail).toBe("amemchatbr@gmail.com");
  });

  it("allows env overrides", () => {
    process.env.NEXT_PUBLIC_APP_NAME = "Test Brand";
    process.env.NEXT_PUBLIC_APP_TAGLINE = "Tag custom";
    process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE = "@custom";
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL = "ola@amemchat.com.br";
    const brand = getBrandConfig();
    expect(brand.name).toBe("Test Brand");
    expect(brand.tagline).toBe("Tag custom");
    expect(brand.socialHandles.instagram).toBe("custom");
    expect(brand.supportEmail).toBe("ola@amemchat.com.br");
    expect(getSupportEmail()).toBe("ola@amemchat.com.br");
  });
});
