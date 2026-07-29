"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  BookOpenText,
  CircleUserRound,
  History,
  Home,
  Menu,
  MessageCircle,
  X,
} from "lucide-react";
import { brand } from "@/config/brand";
import { cn, hasSupabaseEnv } from "@/lib/utils";
import type { PlatformNavItem } from "@/lib/journey/journey-state";

const DEFAULT_NAV: PlatformNavItem[] = [
  { href: "/inicio", label: "Início" },
  { href: "/conta", label: "Conta" },
];

const PRIMARY_DESTINATIONS = [
  { href: "/inicio", label: "Hoje", icon: Home },
  { href: "/conversar", label: "Conversar", icon: MessageCircle },
  { href: "/jornadas", label: "Jornadas", icon: BookOpenText },
  { href: "/conversas", label: "Histórico", icon: History },
] as const;

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
  const drawerRef = useRef<HTMLDivElement>(null);
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
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    requestAnimationFrame(() => {
      drawerRef.current
        ?.querySelector<HTMLElement>('button, a[href]')
        ?.focus();
    });
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function logout() {
    const { clearAllComposerDrafts } = await import(
      "@/lib/conversations/composer-draft"
    );
    const { clearActivationChecklist } = await import(
      "@/lib/activation/session-checklist"
    );
    clearAllComposerDrafts();
    clearActivationChecklist();
    if (hasSupabaseEnv()) {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    router.push("/");
    router.refresh();
  }

  const linkClass = (item: PlatformNavItem) =>
    cn(
      "flex min-h-11 items-center rounded-xl px-3 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      pathname === item.href || pathname.startsWith(`${item.href}/`)
        ? "bg-wine/[0.08] font-medium text-wine"
        : item.dominant
          ? "font-medium text-ink underline underline-offset-4"
          : "text-ink-soft hover:bg-sand-100/80 hover:text-ink",
    );

  const availableHrefs = new Set(items.map((item) => item.href));
  const hasFullAppNav = availableHrefs.has("/conversar");
  const isChat = pathname === "/conversar" || pathname.startsWith("/conversar/");
  const primaryDestinations = PRIMARY_DESTINATIONS.filter((item) =>
    availableHrefs.has(item.href),
  );
  const secondaryItems = items.filter(
    (item) => !PRIMARY_DESTINATIONS.some((primary) => primary.href === item.href),
  );

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/60 bg-card/90 pt-safe backdrop-blur-md md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link
            href="/inicio"
            className="inline-flex min-h-11 items-center font-display text-base tracking-tight text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {brand.name}
          </Link>
          {(!hasFullAppNav || isChat) && (
            <button
              ref={menuButtonRef}
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-expanded={open}
              aria-controls={menuId}
              aria-label={open ? "Fechar menu" : "Abrir menu"}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
            </button>
          )}
        </div>
      </header>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border/60 bg-card/85 px-4 py-6 backdrop-blur-md md:flex">
        <Link
          href="/inicio"
          className="inline-flex min-h-11 items-center px-3 font-display text-xl tracking-tight text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {brand.name}
        </Link>
        <nav
          className="mt-7 flex flex-1 flex-col gap-1"
          aria-label="Navegação da plataforma"
        >
          {items.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(item)}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="space-y-1 border-t border-border/60 pt-4">
          <Link href="/ajuda" className={linkClass({ href: "/ajuda", label: "Ajuda" })}>
            Ajuda e suporte
          </Link>
          <button
            type="button"
            onClick={() => void logout()}
            className="flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm text-ink-soft hover:bg-sand-100/80 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Sair
          </button>
        </div>
      </aside>

      {hasFullAppNav && !isChat ? (
        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-card/95 pb-safe backdrop-blur-lg md:hidden"
          aria-label="Navegação principal"
        >
          <div className="grid h-16 grid-cols-5 px-safe">
            {primaryDestinations.map((item) => {
              const Icon = item.icon;
              const current =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 flex-col items-center justify-center gap-0.5 px-1 text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    current ? "font-medium text-wine" : "text-ink-soft",
                  )}
                >
                  <Icon aria-hidden className="size-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <button
              ref={menuButtonRef}
              type="button"
              aria-expanded={open}
              aria-controls={menuId}
              className="flex min-h-11 flex-col items-center justify-center gap-0.5 px-1 text-[11px] text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              onClick={() => setOpen(true)}
            >
              <CircleUserRound aria-hidden className="size-5" />
              <span>Menu</span>
            </button>
          </div>
        </nav>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/35"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
          />
          <div
            ref={drawerRef}
            id={menuId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${menuId}-title`}
            className="absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-y-auto rounded-t-3xl border-t border-border bg-card px-4 pb-[max(1rem,var(--safe-bottom))] pt-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p id={`${menuId}-title`} className="font-display text-xl text-ink">
                  Seu espaço
                </p>
                <p className="text-xs text-ink-soft">Conta, privacidade e ajuda</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Fechar menu"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <nav className="mt-4 space-y-1" aria-label="Menu da plataforma">
              {secondaryItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={linkClass(item)}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              {hasFullAppNav ? (
                <Link href="/personalizar" className={linkClass({ href: "/personalizar", label: "Personalizar" })} onClick={() => setOpen(false)}>
                  Personalizar experiência
                </Link>
              ) : null}
              <Link href="/ajuda" className={linkClass({ href: "/ajuda", label: "Ajuda" })} onClick={() => setOpen(false)}>
                Ajuda e suporte
              </Link>
              <Link href="/privacidade" className={linkClass({ href: "/privacidade", label: "Privacidade" })} onClick={() => setOpen(false)}>
                Privacidade
              </Link>
              <Link href="/planos" className={linkClass({ href: "/planos", label: "Planos" })} onClick={() => setOpen(false)}>
                Planos
              </Link>
              <button
                type="button"
                onClick={() => void logout()}
                className="flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm text-ink-soft hover:bg-sand-100/80 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Sair
              </button>
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
