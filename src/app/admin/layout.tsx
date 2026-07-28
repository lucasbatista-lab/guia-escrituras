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
    <div className="min-h-app overflow-x-clip lg:flex">
      <AdminMobileNav />
      <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
        <div className="hidden border-b border-border/70 bg-card/50 px-6 py-3 lg:block">
          <p className="text-xs text-ink-soft">
            Sem conteúdo privado de conversas · via admin_roles · timezone
            operacional America/Sao_Paulo · otimizado para operação no celular
          </p>
        </div>
        <main
          id="conteudo-principal"
          tabIndex={-1}
          className="mx-auto w-full max-w-6xl flex-1 overflow-x-clip px-4 py-6 outline-none sm:px-6 lg:py-8 pb-24 lg:pb-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
