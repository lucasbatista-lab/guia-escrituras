import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUserContext } from "@/lib/auth";
import { privateRobotsMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...privateRobotsMetadata,
  title: "Admin",
};

const links = [
  { href: "/admin", label: "Visão geral" },
  { href: "/admin/usuarios", label: "Usuários" },
  { href: "/admin/aquisicao", label: "Aquisição" },
  { href: "/admin/eventos", label: "Eventos" },
  { href: "/admin/uso", label: "Uso" },
  { href: "/admin/custos", label: "Custos" },
  { href: "/admin/parceiros", label: "Parceiros" },
  { href: "/admin/relatorios", label: "Relatórios" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getAuthUserContext();

  if (!auth) {
    redirect("/entrar?next=/admin");
  }

  if (!auth?.isAdmin) {
    redirect("/inicio");
  }

  return (
    <div className="min-h-app">
      <header className="border-b border-border/70 bg-card/50 pt-safe">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <p className="font-display text-lg text-ink">Admin</p>
            <p className="text-xs text-ink-soft">
              Sem conteúdo privado de conversas · via admin_roles
            </p>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm" aria-label="Admin">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex min-h-11 items-center rounded-md px-2 py-1 text-ink-soft hover:bg-sand-200 hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/inicio"
              className="inline-flex min-h-11 items-center rounded-md px-2 py-1 text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Voltar
            </Link>
          </nav>
        </div>
      </header>
      <main
        id="conteudo-principal"
        tabIndex={-1}
        className="mx-auto max-w-6xl px-4 py-8 outline-none sm:px-6"
      >
        {children}
      </main>
    </div>
  );
}
