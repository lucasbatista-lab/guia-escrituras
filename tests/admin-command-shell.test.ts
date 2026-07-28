import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { allAdminNavHrefs, ADMIN_NAV_GROUPS, ADMIN_MOBILE_PRIMARY } from "@/lib/admin/nav";

describe("admin command center shell and navigation (BLOCO I)", () => {
  it("groups every existing admin route into command pillars", () => {
    const hrefs = allAdminNavHrefs();
    expect(hrefs).toEqual([
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
    expect(ADMIN_NAV_GROUPS.map((g) => g.id)).toEqual([
      "comando",
      "crescimento",
      "assinantes",
      "receita",
      "operacao",
    ]);
  });

  it("mobile primary shortcuts cover overview, users, and alerts", () => {
    expect(ADMIN_MOBILE_PRIMARY.map((l) => l.href)).toEqual([
      "/admin",
      "/admin/usuarios",
      "/admin/incidentes",
    ]);
  });

  it("layout uses sidebar/shell with privacy banner and AdminMobileNav", async () => {
    const layout = await fs.readFile("src/app/admin/layout.tsx", "utf8");
    expect(layout).toContain("AdminMobileNav");
    expect(layout).toMatch(/Sem conteúdo privado de conversas/i);
    expect(layout).toContain("isAdmin");
    expect(layout).toContain("lg:flex");
    expect(layout).toContain("pb-24");
  });

  it("nav exposes desktop sidebar groups and mobile menu with focus trap", async () => {
    const nav = await fs.readFile(
      "src/components/admin/admin-mobile-nav.tsx",
      "utf8",
    );
    const config = await fs.readFile("src/lib/admin/nav.ts", "utf8");
    expect(nav).toContain('"use client"');
    expect(nav).toContain("ADMIN_NAV_GROUPS");
    expect(nav).toContain("ADMIN_MOBILE_PRIMARY");
    expect(config).toContain('"/admin/usuarios"');
    expect(config).toContain('"/admin/eventos"');
    expect(config).toContain('"/admin/relatorios"');
    expect(config).toContain('"/admin/ativacao"');
    expect(config).toContain('"/admin/suporte"');
    expect(config).toContain('"/admin/incidentes"');
    expect(nav).toContain("Menu");
    expect(nav).toContain("aria-expanded");
    expect(nav).toContain("aria-controls");
    expect(nav).toContain("Escape");
    expect(nav).toContain("min-h-11");
    expect(nav).toContain('e.key !== "Tab"');
    expect(nav).toContain("shiftKey");
    expect(nav).toContain("wasOpen");
    expect(nav).toContain("buttonRef.current?.focus()");
    expect(nav).toContain("pointerdown");
    expect(nav).toContain("openPath === pathname");
    expect(nav).toContain('role="dialog"');
    expect(nav).toContain("aside");
  });

  it("ships shared page header and visual primitives for the command center", async () => {
    const header = await fs.readFile(
      "src/components/admin/admin-page-header.tsx",
      "utf8",
    );
    const primitives = await fs.readFile(
      "src/components/admin/admin-primitives.tsx",
      "utf8",
    );
    expect(header).toContain("AdminPageHeader");
    expect(header).toContain("eyebrow");
    expect(primitives).toContain("AdminDataQualityBadge");
    expect(primitives).toContain("AdminKpi");
    expect(primitives).toContain("AdminAlertItem");
    expect(primitives).toContain("AdminQueueItem");
    expect(primitives).toContain("AdminEmptyState");
    expect(primitives).toContain("AdminFilterSummary");
    expect(primitives).toContain("AdminExternalToolLink");
  });
});
