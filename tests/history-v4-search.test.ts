import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("history V4 search affordances", () => {
  const client = readFileSync(
    join(
      process.cwd(),
      "src/components/conversations/conversation-history-list.tsx",
    ),
    "utf8",
  );

  it("offers clear-search and next actions on empty filter results", () => {
    expect(client).toContain("Limpar busca");
    expect(client).toContain("Nenhuma conversa corresponde à busca nesta página");
    expect(client).toContain('href="/conversar"');
    expect(client).toContain("Carregar mais conversas");
  });

  it("announces partial local result counts and group regions", () => {
    expect(client).toContain("de ${items.length}");
    expect(client).toContain('role="status"');
    expect(client).toContain('role="region"');
    expect(client).toContain("aria-describedby");
  });
});
