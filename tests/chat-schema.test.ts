import { describe, expect, it } from "vitest";
import { chatRequestSchema } from "@/lib/ai/chat-schema";

describe("chatRequestSchema", () => {
  it("accepts a valid message", () => {
    const parsed = chatRequestSchema.safeParse({
      message: "Estou ansioso com uma decisão.",
      personaKey: "jesus",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects empty message", () => {
    const parsed = chatRequestSchema.safeParse({ message: "   " });
    expect(parsed.success).toBe(false);
  });

  it("rejects oversized message", () => {
    const parsed = chatRequestSchema.safeParse({
      message: "a".repeat(4001),
    });
    expect(parsed.success).toBe(false);
  });

  it("defaults persona and preferDeep", () => {
    const parsed = chatRequestSchema.parse({ message: "Olá" });
    expect(parsed.personaKey).toBe("jesus");
    expect(parsed.preferDeep).toBe(false);
  });
});
