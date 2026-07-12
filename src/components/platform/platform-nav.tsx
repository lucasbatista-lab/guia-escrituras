"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn, hasSupabaseEnv } from "@/lib/utils";

const nav = [
  { href: "/inicio", label: "Início" },
  { href: "/conversar", label: "Conversar" },
  { href: "/conversas", label: "Conversas" },
  { href: "/jornada", label: "Jornada" },
  { href: "/conta", label: "Conta" },
];

export function PlatformNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    if (hasSupabaseEnv()) {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b border-border/70 bg-card/40 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/inicio" className="font-display text-lg text-ink">
          Guia Escrituras
        </Link>
        <nav className="flex flex-1 items-center justify-end gap-1 overflow-x-auto sm:gap-2" aria-label="Plataforma">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm transition",
                pathname === item.href
                  ? "bg-sand-200 text-ink"
                  : "text-ink-soft hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={logout}
            className="ml-1 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm text-ink-soft hover:text-ink"
          >
            Sair
          </button>
        </nav>
      </div>
    </header>
  );
}
