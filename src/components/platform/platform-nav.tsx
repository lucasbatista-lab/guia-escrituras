"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
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
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (wasOpen.current && !open) {
      menuButtonRef.current?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function logout() {
    const { clearAllComposerDrafts } = await import(
      "@/lib/conversations/composer-draft"
    );
    clearAllComposerDrafts();
    if (hasSupabaseEnv()) {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    router.push("/");
    router.refresh();
  }

  const linkClass = (item: PlatformNavItem, mobile = false) =>
    cn(
      "rounded-md text-sm transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
      mobile ? "min-h-11 px-3 py-3" : "whitespace-nowrap px-2.5 py-2.5",
      pathname === item.href || pathname.startsWith(`${item.href}/`)
        ? "bg-sand-200 text-ink"
        : item.dominant
          ? "font-medium text-ink underline underline-offset-4"
          : "text-ink-soft hover:text-ink",
    );

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-card/80 pt-safe backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <Link
          href="/inicio"
          className="min-h-11 font-display text-lg leading-[2.75rem] tracking-tight text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {brand.name}
        </Link>

        <nav
          className="hidden flex-1 items-center justify-end gap-1 md:flex"
          aria-label="Plataforma"
        >
          {items.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(item)}>
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => void logout()}
            className="ml-2 min-h-11 whitespace-nowrap rounded-md px-2.5 py-2.5 text-sm text-ink-soft/90 hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Sair
          </button>
        </nav>

        <button
          ref={menuButtonRef}
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border/80 text-ink md:hidden focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <span aria-hidden className="flex flex-col gap-1.5">
            <span
              className={cn(
                "block h-0.5 w-4 bg-ink transition",
                open && "translate-y-[4px] rotate-45",
              )}
            />
            <span
              className={cn("block h-0.5 w-4 bg-ink transition", open && "opacity-0")}
            />
            <span
              className={cn(
                "block h-0.5 w-4 bg-ink transition",
                open && "-translate-y-[4px] -rotate-45",
              )}
            />
          </span>
        </button>
      </div>

      {open ? (
        <nav
          id={menuId}
          className="border-t border-border/60 px-4 pb-4 pt-2 md:hidden"
          aria-label="Menu da plataforma"
        >
          <ul className="flex flex-col">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn("block", linkClass(item, true))}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  void logout();
                }}
                className="mt-1 min-h-11 w-full rounded-md px-3 py-3 text-left text-sm text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                Sair
              </button>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
