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

  it("nav exposes primary ops links and mobile Mais panel", () => {
    const nav = read("src", "components", "admin", "admin-mobile-nav.tsx");
    expect(nav).toContain('"use client"');
    expect(nav).toContain("/admin/usuarios");
    expect(nav).toContain("/admin/eventos");
    expect(nav).toContain("/admin/relatorios");
    expect(nav).toContain("Mais");
    expect(nav).toContain("aria-expanded");
    expect(nav).toContain("aria-controls");
    expect(nav).toContain("Escape");
    expect(nav).toContain("min-h-11");
  });

  it("contains Tab focus in Mais panel and restores trigger on close", () => {
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

  it("user list remains card rows with touch-friendly pagination", () => {
    const users = read("src", "app", "admin", "usuarios", "page.tsx");
    expect(users).toContain("Nenhum usuário encontrado");
    expect(users).toContain("min-h-11");
    expect(users).not.toContain("<table");
  });
});
