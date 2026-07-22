"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

const PRIMARY = [
  { href: "/admin", label: "Visão geral", match: (p: string) => p === "/admin" },
  {
    href: "/admin/usuarios",
    label: "Usuários",
    match: (p: string) => p.startsWith("/admin/usuarios"),
  },
  {
    href: "/admin/eventos",
    label: "Eventos",
    match: (p: string) => p.startsWith("/admin/eventos"),
  },
  {
    href: "/admin/relatorios",
    label: "Relatórios",
    match: (p: string) => p.startsWith("/admin/relatorios"),
  },
] as const;

const MORE = [
  { href: "/admin/aquisicao", label: "Aquisição" },
  { href: "/admin/uso", label: "Uso" },
  { href: "/admin/custos", label: "Custos" },
  { href: "/admin/parceiros", label: "Parceiros" },
] as const;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function linkClass(active: boolean) {
  return [
    "inline-flex min-h-11 items-center rounded-md px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
    active
      ? "bg-sand-200 font-medium text-ink"
      : "text-ink-soft hover:bg-sand-200 hover:text-ink",
  ].join(" ");
}

function listFocusable(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true",
  );
}

export function AdminMobileNav() {
  const pathname = usePathname() ?? "/admin";
  /** Open only while still on the path that opened the panel. */
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  // Restore focus to the trigger after close (Escape, outside, route, toggle).
  useEffect(() => {
    if (wasOpen.current && !open) {
      buttonRef.current?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    const first = listFocusable(panel)[0];
    first?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpenPath(null);
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const focusables = listFocusable(panel);
      if (focusables.length === 0) return;
      const firstEl = focusables[0]!;
      const lastEl = focusables[focusables.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === firstEl || !panel.contains(active)) {
          e.preventDefault();
          lastEl.focus();
        }
        return;
      }
      if (active === lastEl || !panel.contains(active)) {
        e.preventDefault();
        firstEl.focus();
      }
    }

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (panel?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setOpenPath(null);
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  function closeMenu() {
    setOpenPath(null);
  }

  function toggleMenu() {
    setOpenPath((current) => (current === pathname ? null : pathname));
  }

  return (
    <nav aria-label="Admin" className="w-full">
      <div className="hidden flex-wrap gap-1 md:flex">
        {[...PRIMARY, ...MORE].map((link) => {
          const active =
            "match" in link
              ? link.match(pathname)
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={linkClass(Boolean(active))}
              aria-current={active ? "page" : undefined}
            >
              {link.label}
            </Link>
          );
        })}
        <Link href="/inicio" className={linkClass(false)}>
          Voltar ao app
        </Link>
      </div>

      <div className="md:hidden">
        <div className="flex flex-wrap gap-1">
          {PRIMARY.map((link) => {
            const active = link.match(pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={linkClass(active)}
                aria-current={active ? "page" : undefined}
                onClick={closeMenu}
              >
                {link.label}
              </Link>
            );
          })}
          <button
            ref={buttonRef}
            type="button"
            className={linkClass(open)}
            aria-expanded={open}
            aria-controls={panelId}
            aria-haspopup="true"
            onClick={toggleMenu}
          >
            Mais
          </button>
        </div>
        {open ? (
          <div
            ref={panelRef}
            id={panelId}
            className="mt-2 flex flex-col gap-1 rounded-lg border border-border/70 bg-card p-2"
            role="region"
            aria-label="Mais seções do admin"
          >
            {MORE.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={linkClass(active)}
                  aria-current={active ? "page" : undefined}
                  onClick={closeMenu}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/inicio"
              className={linkClass(false)}
              onClick={closeMenu}
            >
              Voltar ao app
            </Link>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
