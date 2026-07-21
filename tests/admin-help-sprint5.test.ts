import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildSupportMailto } from "@/lib/support/help-center";

describe("admin daily ops V2", () => {
  it("overview exposes a mobile daily summary with actionable links", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/admin/page.tsx"),
      "utf8",
    );
    expect(page).toContain("Resumo do dia");
    expect(page).toContain("Revisão rápida no celular");
    expect(page).toContain("Alertas abertos");
    expect(page).toContain("/admin/aquisicao");
    expect(page).toContain("Sem conteúdo de conversas");
  });
});

describe("help center V4 empty search and mailto", () => {
  it("empty search offers clear action and category anchors", () => {
    const search = readFileSync(
      join(process.cwd(), "src/components/support/help-faq-search.tsx"),
      "utf8",
    );
    const ajuda = readFileSync(
      join(process.cwd(), "src/app/(marketing)/ajuda/page.tsx"),
      "utf8",
    );
    expect(search).toContain("Limpar busca");
    expect(search).toContain("não é aconselhamento pastoral");
    expect(search).toContain("#contato-");
    expect(ajuda).toContain("contato-${cat.id}");
  });

  it("technical mailto asks for requestId without spiritual content", () => {
    const href = buildSupportMailto("tecnico");
    if (!href) return;
    const body = decodeURIComponent(href.split("body=")[1] ?? "");
    expect(body).toMatch(/requestId/i);
    expect(body.toLowerCase()).toContain("não inclua o conteúdo completo");
  });
});
