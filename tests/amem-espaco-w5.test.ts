import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("W5 / Wave 3A Espaço living archive V17", () => {
  it("hub is memory-first with pile + Linha viva (not admin dashboard)", () => {
    const hub = read("src", "app", "(platform)", "espaco", "page.tsx");
    expect(hub).toContain("Linha viva");
    expect(hub).toContain("Memória viva");
    expect(hub).toContain("/espaco/oracoes");
    expect(hub).toContain("/espaco/diario");
    expect(hub).toContain("/espaco/salvos");
    expect(hub).toContain("data-espaco-state");
    expect(hub).not.toMatch(/grid-cols-3/);
    expect(hub).not.toMatch(/emoji|🙏|📝|⭐/);
  });

  it("empty state uses V17 job copy and CTAs", () => {
    const hub = read("src", "app", "(platform)", "espaco", "page.tsx");
    expect(hub).toContain("Este lugar vai guardar o que importa para você.");
    expect(hub).toContain("Primeira oração");
    expect(hub).toContain("Começar pelo Hoje");
    expect(hub).toContain("Abrir Hoje");
  });

  it("preserves prayer CRUD affordances", () => {
    const prayer = read("src", "components", "workspace", "prayer-workspace.tsx");
    expect(prayer).toMatch(/criar|nova oração|Escrever/i);
    expect(prayer).toMatch(/respondida|answered/i);
    expect(prayer).toMatch(/excluir|remover|delete/i);
  });

  it("journal stays intimate and private from analytics/AI", () => {
    const journal = read(
      "src",
      "components",
      "workspace",
      "journal-workspace.tsx",
    );
    expect(journal).toMatch(/privado|privad/i);
    expect(journal).toMatch(/IA|analytics/i);
    const diario = read("src", "app", "(platform)", "espaco", "diario", "page.tsx");
    expect(diario).toMatch(/íntimo|analytics|IA/);
  });

  it("salvos is an editorial collection with type, title, human date", () => {
    const salvos = read("src", "app", "(platform)", "espaco", "salvos", "page.tsx");
    expect(salvos).toContain("ListRow");
    expect(salvos).toContain("typeLabel");
    expect(salvos).toContain("humanDate");
    expect(salvos).toContain("Abrir Hoje");
    expect(salvos).not.toMatch(/João 3:16 invent|fake verse|lorem/i);
  });
});
