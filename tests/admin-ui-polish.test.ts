import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { allAdminNavHrefs } from "@/lib/admin/nav";

async function read(path: string) {
  return fs.readFile(path, "utf8");
}

describe("admin UI mobile and accessibility polish (BLOCO M)", () => {
  it("layout clips horizontal overflow and reserves mobile bottom nav space", async () => {
    const layout = await read("src/app/admin/layout.tsx");
    expect(layout).toContain("overflow-x-clip");
    expect(layout).toContain("pb-24");
    expect(layout).toContain('id="conteudo-principal"');
    expect(layout).toContain("AdminMobileNav");
  });

  it("mobile menu locks body scroll, traps focus, and uses dialog semantics", async () => {
    const nav = await read("src/components/admin/admin-mobile-nav.tsx");
    expect(nav).toContain('document.body.style.overflow = "hidden"');
    expect(nav).toContain('role="dialog"');
    expect(nav).toContain("aria-modal");
    expect(nav).toContain("aria-expanded");
    expect(nav).toContain("aria-current");
    expect(nav).toContain("min-h-11");
    expect(nav).toContain("Escape");
    expect(nav).toContain('e.key !== "Tab"');
    expect(nav).toContain("motion-safe:animate-fade-up");
  });

  it("preserves every admin route in navigation config", () => {
    expect(allAdminNavHrefs()).toEqual([
      "/admin",
      "/admin/aquisicao",
      "/admin/parceiros",
      "/admin/usuarios",
      "/admin/ativacao",
      "/admin/uso",
      "/admin/eventos",
      "/admin/relatorios",
      "/admin/custos",
      "/admin/suporte",
      "/admin/incidentes",
    ]);
  });

  it("dashboard keeps quality labels and command hierarchy on first paint", async () => {
    const page = await read("src/app/admin/page.tsx");
    expect(page).toContain("admin-command-strip");
    expect(page).toContain("Alertas prioritários");
    expect(page).toContain('title="Hoje"');
    expect(page).toContain("admin-filas-operacionais");
    expect(page).toContain("PARCIAL");
    expect(page).toContain("America/Sao_Paulo");
    expect(page).not.toContain("w-screen");
  });

  it("users list converts tables on desktop and keeps mobile cards", async () => {
    const page = await read("src/app/admin/usuarios/page.tsx");
    expect(page).toContain("hidden overflow-x-auto md:block");
    expect(page).toContain("md:hidden");
    expect(page).toContain("<caption");
    expect(page).toContain("AdminFilterSummary");
    expect(page).toContain("Fila aberta");
    expect(page).toContain("min-h-11");
  });

  it("subscriber detail keeps operational order and return context", async () => {
    const page = await read("src/app/admin/usuarios/[userId]/page.tsx");
    const statusIdx = page.indexOf("Status e alertas");
    const accountIdx = page.indexOf("Conta e assinatura");
    const actionsIdx = page.indexOf("Ações e atalhos");
    const milestonesIdx = page.indexOf("Marcos operacionais");
    const usageIdx = page.indexOf("Uso e ativação");
    const acquisitionIdx = page.indexOf(">Aquisição<");
    const paymentsIdx = page.indexOf("Pagamentos relacionados");
    const technicalIdx = page.indexOf("Dados técnicos");
    expect(statusIdx).toBeGreaterThan(-1);
    expect(accountIdx).toBeGreaterThan(statusIdx);
    expect(actionsIdx).toBeGreaterThan(-1);
    expect(milestonesIdx).toBeGreaterThan(accountIdx);
    expect(usageIdx).toBeGreaterThan(milestonesIdx);
    expect(acquisitionIdx).toBeGreaterThan(usageIdx);
    expect(paymentsIdx).toBeGreaterThan(acquisitionIdx);
    expect(technicalIdx).toBeGreaterThan(-1);
    expect(page).toContain("Voltar para usuários");
    expect(page).toContain("resolveAdminUsersReturnHref");
  });

  it("specialized routes use shared headers and data-state primitives", async () => {
    const files = [
      "src/app/admin/aquisicao/page.tsx",
      "src/app/admin/ativacao/page.tsx",
      "src/app/admin/eventos/page.tsx",
      "src/app/admin/relatorios/page.tsx",
      "src/app/admin/uso/page.tsx",
      "src/app/admin/custos/page.tsx",
      "src/app/admin/parceiros/page.tsx",
      "src/app/admin/suporte/page.tsx",
      "src/app/admin/incidentes/page.tsx",
    ];
    for (const file of files) {
      const source = await read(file);
      expect(source).toContain("AdminPageHeader");
      expect(source).not.toContain("w-screen");
    }
  });

  it("error and empty primitives expose recoverable actions and digests", async () => {
    const errorPage = await read("src/app/admin/error.tsx");
    const primitives = await read("src/components/admin/admin-primitives.tsx");
    expect(errorPage).toContain("AdminEmptyState");
    expect(errorPage).toContain("Identificador técnico");
    expect(errorPage).toContain("Tentar de novo");
    expect(errorPage).toContain("min-h-11");
    expect(primitives).toContain('tone?: "empty" | "filtered" | "unavailable" | "partial" | "error"');
    expect(primitives).toContain("AdminDataQualityBadge");
    expect(primitives).toContain("PARCIAL");
    expect(primitives).toContain("ESTIMADA");
    expect(primitives).toContain("INDISPONÍVEL");
  });

  it("KPI and queue items avoid number clipping with min-w-0 / break-words", async () => {
    const primitives = await read("src/components/admin/admin-primitives.tsx");
    expect(primitives).toContain("min-w-0");
    expect(primitives).toContain("break-words");
    expect(primitives).toContain("AdminQueueItem");
    expect(primitives).toContain("Ver fila");
  });
});
