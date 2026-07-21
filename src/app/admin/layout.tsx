import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { getAuthUserContext } from "@/lib/auth";
import { privateRobotsMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...privateRobotsMetadata,
  title: "Admin",
};

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
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6">
          <div>
            <p className="font-display text-lg text-ink">Admin</p>
            <p className="text-xs text-ink-soft">
              Sem conteúdo privado de conversas · via admin_roles · otimizado
              para operação no celular
            </p>
          </div>
          <AdminMobileNav />
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
