import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_CHAT_PERSONA_KEY,
  MAX_CHAT_PERSONA_KEY_LENGTH,
  resolveAuthorizedPersonaKey,
} from "@/lib/ai/chat-persona";
import { chatRequestSchema } from "@/lib/ai/chat-schema";

const root = process.cwd();

describe("chat persona authorization", () => {
  it("allows active default personas for evangelical (no maria)", () => {
    expect(
      resolveAuthorizedPersonaKey({
        requested: "jesus",
        traditionKey: "evangelical",
        saintsContentEnabled: false,
      }),
    ).toEqual({ personaKey: "jesus", fellBack: false });

    expect(
      resolveAuthorizedPersonaKey({
        requested: "paulo",
        traditionKey: "evangelical",
        saintsContentEnabled: false,
      }),
    ).toEqual({ personaKey: "paulo", fellBack: false });
  });

  it("falls back inactive pedro and tradition-blocked maria", () => {
    expect(
      resolveAuthorizedPersonaKey({
        requested: "pedro",
        traditionKey: "catholic",
        saintsContentEnabled: true,
      }).personaKey,
    ).toBe(DEFAULT_CHAT_PERSONA_KEY);

    expect(
      resolveAuthorizedPersonaKey({
        requested: "maria",
        traditionKey: "evangelical",
        saintsContentEnabled: true,
      }),
    ).toEqual({ personaKey: "jesus", fellBack: true });
  });

  it("allows maria only when tradition and saints prefs permit", () => {
    expect(
      resolveAuthorizedPersonaKey({
        requested: "maria",
        traditionKey: "catholic",
        saintsContentEnabled: true,
      }),
    ).toEqual({ personaKey: "maria", fellBack: false });

    expect(
      resolveAuthorizedPersonaKey({
        requested: "maria",
        traditionKey: "catholic",
        saintsContentEnabled: false,
      }).fellBack,
    ).toBe(true);
  });

  it("rejects oversized or malformed keys via fallback / schema", () => {
    expect(
      resolveAuthorizedPersonaKey({
        requested: "x".repeat(MAX_CHAT_PERSONA_KEY_LENGTH + 1),
        traditionKey: "ecumenical",
        saintsContentEnabled: false,
      }).fellBack,
    ).toBe(true);

    expect(
      resolveAuthorizedPersonaKey({
        requested: "../evil",
        traditionKey: "ecumenical",
        saintsContentEnabled: false,
      }).fellBack,
    ).toBe(true);

    const oversize = chatRequestSchema.safeParse({
      message: "olá",
      personaKey: "a".repeat(MAX_CHAT_PERSONA_KEY_LENGTH + 1),
    });
    expect(oversize.success).toBe(false);
  });
});

describe("private API cache headers", () => {
  it("chat and usage routes set private no-store on responses", () => {
    const chat = readFileSync(
      join(root, "src", "app", "api", "chat", "route.ts"),
      "utf8",
    );
    const usage = readFileSync(
      join(root, "src", "app", "api", "usage", "route.ts"),
      "utf8",
    );
    expect(chat).toContain('Cache-Control": "private, no-store"');
    expect(usage).toContain('Cache-Control": "private, no-store"');
    expect(chat).toContain("PRIVATE_NO_STORE");
    expect(usage).toContain("PRIVATE_NO_STORE");
  });

  it("chat-service resolves persona before create/policy", () => {
    const service = readFileSync(
      join(root, "src", "lib", "ai", "chat-service.ts"),
      "utf8",
    );
    expect(service).toContain("resolveAuthorizedPersonaKey");
    expect(service).toContain("chat_persona_fallback");
  });
});
