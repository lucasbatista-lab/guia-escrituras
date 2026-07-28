/**
 * Admin command-center navigation — visual grouping only.
 * Routes are unchanged; groups communicate operational pillars.
 */

export type AdminNavLink = {
  href: string;
  label: string;
  /** Exact match for /admin; prefix match for nested routes. */
  exact?: boolean;
};

export type AdminNavGroup = {
  id: string;
  label: string;
  links: readonly AdminNavLink[];
};

export const ADMIN_NAV_GROUPS: readonly AdminNavGroup[] = [
  {
    id: "comando",
    label: "Comando",
    links: [{ href: "/admin", label: "Visão geral", exact: true }],
  },
  {
    id: "crescimento",
    label: "Crescimento",
    links: [
      { href: "/admin/aquisicao", label: "Aquisição" },
      { href: "/admin/parceiros", label: "Parceiros" },
    ],
  },
  {
    id: "assinantes",
    label: "Assinantes e produto",
    links: [
      { href: "/admin/usuarios", label: "Usuários" },
      { href: "/admin/ativacao", label: "Ativação" },
      { href: "/admin/uso", label: "Uso" },
    ],
  },
  {
    id: "receita",
    label: "Receita",
    links: [
      { href: "/admin/eventos", label: "Eventos" },
      { href: "/admin/relatorios", label: "Relatórios" },
      { href: "/admin/custos", label: "Custos" },
    ],
  },
  {
    id: "operacao",
    label: "Operação",
    links: [
      { href: "/admin/suporte", label: "Suporte" },
      { href: "/admin/incidentes", label: "Incidentes" },
    ],
  },
] as const;

/** Mobile bottom bar — always reachable operational shortcuts. */
export const ADMIN_MOBILE_PRIMARY: readonly AdminNavLink[] = [
  { href: "/admin", label: "Visão geral", exact: true },
  { href: "/admin/usuarios", label: "Usuários" },
  { href: "/admin/incidentes", label: "Alertas" },
] as const;

export const ADMIN_APP_EXIT_HREF = "/inicio";
export const ADMIN_APP_EXIT_LABEL = "Voltar ao app";

export function isAdminNavActive(
  pathname: string,
  link: AdminNavLink,
): boolean {
  if (link.exact) return pathname === link.href;
  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}

export function findAdminNavContext(pathname: string): {
  group: AdminNavGroup | null;
  link: AdminNavLink | null;
} {
  for (const group of ADMIN_NAV_GROUPS) {
    for (const link of group.links) {
      if (isAdminNavActive(pathname, link)) {
        return { group, link };
      }
    }
  }
  return { group: null, link: null };
}

export function allAdminNavHrefs(): string[] {
  return ADMIN_NAV_GROUPS.flatMap((g) => g.links.map((l) => l.href));
}
