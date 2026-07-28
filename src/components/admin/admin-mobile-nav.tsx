"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  ADMIN_APP_EXIT_HREF,
  ADMIN_APP_EXIT_LABEL,
  ADMIN_MOBILE_PRIMARY,
  ADMIN_NAV_GROUPS,
  findAdminNavContext,
  isAdminNavActive,
  type AdminNavLink,
} from "@/lib/admin/nav";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function listFocusable(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true",
  );
}

function navLinkClass(active: boolean, dense = false) {
  return cn(
    "inline-flex min-h-11 items-center rounded-md text-sm transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
    dense ? "px-2.5 py-2" : "px-3 py-2.5",
    active
      ? "bg-sand-200 font-medium text-ink"
      : "text-ink-soft hover:bg-sand-200/70 hover:text-ink",
  );
}

function NavLinkItem({
  link,
  pathname,
  onNavigate,
  dense = false,
}: {
  link: AdminNavLink;
  pathname: string;
  onNavigate?: () => void;
  dense?: boolean;
}) {
  const active = isAdminNavActive(pathname, link);
  return (
    <Link
      href={link.href}
      className={navLinkClass(active, dense)}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
    >
      {link.label}
    </Link>
  );
}

function GroupedNavLinks({
  pathname,
  onNavigate,
  dense = false,
}: {
  pathname: string;
  onNavigate?: () => void;
  dense?: boolean;
}) {
  return (
    <div className="space-y-4">
      {ADMIN_NAV_GROUPS.map((group) => (
        <div key={group.id}>
          <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold">
            {group.label}
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.links.map((link) => (
              <li key={link.href}>
                <NavLinkItem
                  link={link}
                  pathname={pathname}
                  onNavigate={onNavigate}
                  dense={dense}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Desktop sidebar + mobile bottom bar with full grouped menu. */
export function AdminMobileNav() {
  const pathname = usePathname() ?? "/admin";
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const { group, link } = findAdminNavContext(pathname);

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
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden w-56 shrink-0 flex-col border-r border-border/70 bg-card/40 lg:flex"
        aria-label="Navegação do Admin"
      >
        <div className="border-b border-border/60 px-4 py-4">
          <p className="font-display text-lg text-ink">{brand.name}</p>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gold">
            Centro de comando
          </p>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-4" aria-label="Admin">
          <GroupedNavLinks pathname={pathname} dense />
          <div className="mt-6 border-t border-border/60 pt-3">
            <Link
              href={ADMIN_APP_EXIT_HREF}
              className={navLinkClass(false, true)}
            >
              {ADMIN_APP_EXIT_LABEL}
            </Link>
          </div>
        </nav>
      </aside>

      {/* Mobile top context + bottom bar */}
      <div className="lg:hidden">
        <div className="border-b border-border/70 bg-card/70 px-4 py-3 pt-safe">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display text-lg text-ink">{brand.name}</p>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gold">
                Admin · centro de comando
              </p>
              {group && link ? (
                <p className="mt-1 truncate text-xs text-ink-soft">
                  {group.label} · {link.label}
                </p>
              ) : null}
            </div>
            <p className="max-w-[9rem] text-right text-[10px] leading-snug text-ink-soft">
              Sem conteúdo privado de conversas
            </p>
          </div>
        </div>

        {open ? (
          <>
            <div
              className="fixed inset-0 z-40 bg-ink/25"
              aria-hidden="true"
              onClick={closeMenu}
            />
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-label="Menu completo do Admin"
              className="fixed inset-x-0 bottom-0 z-50 max-h-[80dvh] overflow-y-auto rounded-t-2xl border border-border/70 bg-card p-4 pb-safe shadow-[0_-8px_32px_rgba(44,36,28,0.12)] motion-safe:animate-fade-up"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="font-display text-lg text-ink">Menu do Admin</p>
                <button
                  type="button"
                  className={navLinkClass(false)}
                  onClick={closeMenu}
                >
                  Fechar
                </button>
              </div>
              <nav aria-label="Admin — menu completo">
                <GroupedNavLinks pathname={pathname} onNavigate={closeMenu} />
                <div className="mt-4 border-t border-border/60 pt-3">
                  <Link
                    href={ADMIN_APP_EXIT_HREF}
                    className={navLinkClass(false)}
                    onClick={closeMenu}
                  >
                    {ADMIN_APP_EXIT_LABEL}
                  </Link>
                </div>
              </nav>
            </div>
          </>
        ) : (
          <div id={panelId} hidden />
        )}

        <nav
          aria-label="Admin — atalhos"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-card/95 pb-safe backdrop-blur-md"
        >
          <div className="mx-auto grid max-w-lg grid-cols-4 gap-0.5 px-1 py-1">
            {ADMIN_MOBILE_PRIMARY.map((item) => {
              const active = isAdminNavActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-h-11 flex-col items-center justify-center rounded-md px-1 py-1 text-center text-[11px] leading-tight focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    active
                      ? "bg-sand-200 font-medium text-ink"
                      : "text-ink-soft hover:bg-sand-100",
                  )}
                  aria-current={active ? "page" : undefined}
                  onClick={closeMenu}
                >
                  {item.label}
                </Link>
              );
            })}
            <button
              ref={buttonRef}
              type="button"
              className={cn(
                "flex min-h-11 flex-col items-center justify-center rounded-md px-1 py-1 text-center text-[11px] leading-tight focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                open
                  ? "bg-sand-200 font-medium text-ink"
                  : "text-ink-soft hover:bg-sand-100",
              )}
              aria-expanded={open}
              aria-controls={panelId}
              aria-haspopup="dialog"
              onClick={toggleMenu}
            >
              Menu
            </button>
          </div>
        </nav>
      </div>
    </>
  );
}
