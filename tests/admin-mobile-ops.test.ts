import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("admin mobile operations V1", () => {
  it("layout uses collapsible AdminMobileNav and keeps privacy banner", () => {
    const layout = read("src", "app", "admin", "layout.tsx");
    expect(layout).toContain("AdminMobileNav");
    expect(layout).toMatch(/Sem conteúdo privado de conversas/i);
    expect(layout).toMatch(/celular/i);
    expect(layout).toContain("isAdmin");
  });

  it("nav exposes primary ops links and mobile Menu panel", () => {
    const nav = read("src", "components", "admin", "admin-mobile-nav.tsx");
    const config = read("src", "lib", "admin", "nav.ts");
    expect(nav).toContain('"use client"');
    expect(config).toContain("/admin/usuarios");
    expect(config).toContain("/admin/eventos");
    expect(config).toContain("/admin/relatorios");
    expect(nav).toContain("Menu");
    expect(nav).toContain("aria-expanded");
    expect(nav).toContain("aria-controls");
    expect(nav).toContain("Escape");
    expect(nav).toContain("min-h-11");
  });

  it("contains Tab focus in Menu panel and restores trigger on close", () => {
    const nav = read("src", "components", "admin", "admin-mobile-nav.tsx");
    expect(nav).toContain('e.key !== "Tab"');
    expect(nav).toContain("shiftKey");
    expect(nav).toContain("wasOpen");
    expect(nav).toContain("buttonRef.current?.focus()");
    expect(nav).toContain("pointerdown");
    expect(nav).toContain("openPath === pathname");
    expect(nav).toContain("setOpenPath(null)");
  });

  it("acquisition uses mobile cards instead of only wide tables", () => {
    const page = read("src", "app", "admin", "aquisicao", "page.tsx");
    expect(page).toContain("md:hidden");
    expect(page).toContain("hidden overflow-x-auto md:block");
    expect(page).toContain("<caption");
  });

  it("ships admin loading skeleton", () => {
    const loading = read("src", "app", "admin", "loading.tsx");
    expect(loading).toContain('role="status"');
    expect(loading).toContain("Carregando");
  });

  it("user list uses dense desktop table and compact mobile cards", () => {
    const users = read("src", "app", "admin", "usuarios", "page.tsx");
    expect(users).toContain("Nenhum usuário encontrado");
    expect(users).toContain("min-h-11");
    expect(users).toContain("buildAdminUserDetailHref");
    expect(users).toContain("<table");
    expect(users).toContain("md:hidden");
    expect(users).toContain("hidden overflow-x-auto md:block");
    expect(users).toContain("<caption");
  });

  it("user detail back link stays touch-friendly and filter-aware", () => {
    const detail = read("src", "app", "admin", "usuarios", "[userId]", "page.tsx");
    expect(detail).toContain("resolveAdminUsersReturnHref");
    expect(detail).toContain("Voltar para usuários");
    expect(detail).toContain("min-h-11");
    expect(detail).not.toContain("document.referrer");
  });

  it("admin error keeps retry CTA and safe digest copy on mobile", () => {
    const errorPage = read("src", "app", "admin", "error.tsx");
    expect(errorPage).toContain("min-h-11");
    expect(errorPage).toContain("Identificador técnico");
    expect(errorPage).toContain("Tentar de novo");
  });
});
