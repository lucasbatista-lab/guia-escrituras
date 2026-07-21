import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("aprofundar V3 post-response affordance", () => {
  it("explains deepened reply is per-message and next turn is optional", () => {
    const panel = readFileSync(
      join(process.cwd(), "src/components/chat/chat-panel.tsx"),
      "utf8",
    );
    expect(panel).toContain("Resposta aprofundada · só nesta mensagem");
    expect(panel).toContain("seguir conversando normalmente");
    expect(panel).toContain("opcional");
    expect(panel).not.toMatch(/revela[cç][aã]o|voz de deus|superior espiritual/i);
  });
});
