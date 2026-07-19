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
    <div className="min-h-screen">
      <header className="border-b border-border/70 bg-card/50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <p className="font-display text-lg text-ink">Admin</p>
            <p className="text-xs text-ink-soft">
              Sem conteúdo privado de conversas · via admin_roles
            </p>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-2 py-1 text-ink-soft hover:bg-sand-200 hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/inicio"
              className="rounded-md px-2 py-1 text-ink-soft hover:text-ink"
            >
              Voltar
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
