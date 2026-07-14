"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { brand } from "@/config/brand";
import { cn, hasSupabaseEnv } from "@/lib/utils";
import type { PlatformNavItem } from "@/lib/journey/journey-state";

const DEFAULT_NAV: PlatformNavItem[] = [
  { href: "/inicio", label: "Início" },
  { href: "/conta", label: "Conta" },
];

export function PlatformNav({
  items = DEFAULT_NAV,
}: {
  items?: PlatformNavItem[];
}) {
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
          {brand.name}
        </Link>
        <nav
          className="flex flex-1 items-center justify-end gap-1 overflow-x-auto sm:gap-2"
          aria-label="Plataforma"
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "whitespace-nowrap rounded-md px-2.5 py-2.5 text-sm transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                pathname === item.href
                  ? "bg-sand-200 text-ink"
                  : item.dominant
                    ? "font-medium text-ink underline underline-offset-4"
                    : "text-ink-soft hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={logout}
            className="ml-1 min-h-11 whitespace-nowrap rounded-md px-2.5 py-2.5 text-sm text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Sair
          </button>
        </nav>
      </div>
    </header>
  );
}
